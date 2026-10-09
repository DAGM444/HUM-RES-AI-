import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma.js';
import { requireAuth } from './middleware/auth.js';
import { Status } from '@prisma/client';
import { sendEmail } from './lib/email.js';

const app = express();
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ==========================================
// AUTH ROUTES
// ==========================================

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Returns: { token, user: { id, email, role, name, employeeId } }
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const secret = process.env.JWT_SECRET!;
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.employee?.name ?? user.email,
        employeeId: user.employeeId ?? null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Returns: current user profile from token
 */
app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { employee: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.employee?.name ?? user.email,
      employeeId: user.employeeId ?? null,
      employee: user.employee,
    });
  } catch (error) {
    console.error('/me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 1. EMPLOYEE ENDPOINTS
// ==========================================
app.get('/api/employees', async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      include: { manager: true, subordinates: true }
    });
    res.json(employees);
  } catch (error) {
    console.error('Fetch employees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/employees', async (req: Request, res: Response) => {
  try {
    const newEmployee = await prisma.employee.create({ data: req.body });
    res.status(201).json(newEmployee);
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(400).json({ error: 'Invalid data provided' });
  }
});

/**
 * GET /api/employees/:id
 * Returns full employee detail — notes, manager, subordinates, tasks.
 * Protected.
 */
app.get('/api/employees/:id', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid employee ID' });
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        manager: true,
        subordinates: true,
        supervisorNotes: {
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          orderBy: { dueDate: 'desc' },
        },
      },
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    res.json(employee);
  } catch (error) {
    console.error('Fetch employee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/employees/:id/notes
 * Body: { note: string }
 * Adds a supervisor note. Author is taken from the authenticated user's name.
 * Protected.
 */
app.post('/api/employees/:id/notes', requireAuth, async (req: Request, res: Response) => {
  const employeeId = Number(req.params.id);
  if (isNaN(employeeId)) {
    res.status(400).json({ error: 'Invalid employee ID' });
    return;
  }

  const { note } = req.body as { note?: string };
  if (!note || !note.trim()) {
    res.status(400).json({ error: 'Note text is required' });
    return;
  }

  try {
    // Resolve author name from the authenticated user's linked employee, or email
    const authUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { employee: true },
    });
    const author = authUser?.employee?.name ?? authUser?.email ?? 'Unknown';

    const created = await prisma.supervisorNote.create({
      data: { employeeId, author, note: note.trim() },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/employees/:id/status
 * Body: { status: 'ACTIVE' | 'UNDER_REVIEW' | 'ON_LEAVE' }
 * Updates the employee's status.
 * Protected.
 */
app.patch('/api/employees/:id/status', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid employee ID' });
    return;
  }

  const { status } = req.body as { status?: string };
  const validStatuses: Status[] = ['ACTIVE', 'UNDER_REVIEW', 'ON_LEAVE', 'TERMINATED'];

  if (!status || !validStatuses.includes(status as Status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  try {
    const updated = await prisma.employee.update({
      where: { id },
      data: { status: status as Status },
    });
    res.json(updated);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(400).json({ error: 'Failed to update employee status' });
  }
});

// ==========================================
// 2. TASK / PENDING ACTION ENDPOINTS
// ==========================================
app.get('/api/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      include: { assignedTo: true },
      orderBy: { id: 'desc' }
    });
    res.json(tasks);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/tasks', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      title,
      employeeId,
      actionType,
      reason,
      priority,
      dueDate,
      urgency,
      type,
      score,
      department,
      initiatedBy,
      initiatorRole,
      supportingDocs
    } = req.body;

    if (!title || !employeeId) {
      res.status(400).json({ error: 'title and employeeId are required' });
      return;
    }

    const authUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { employee: true }
    });

    const newTask = await prisma.task.create({
      data: {
        title,
        employeeId: Number(employeeId),
        actionType: actionType || 'review',
        reason: reason || null,
        priority: priority || 'medium',
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        urgency: urgency || 'MEDIUM',
        type: type || 'REVIEW',
        score: score ? Number(score) : null,
        department: department || null,
        initiatedBy: initiatedBy || authUser?.employee?.name || authUser?.email || 'HR Manager',
        initiatorRole: initiatorRole || (authUser?.role === 'HR' ? 'Human Resources' : 'Management'),
        supportingDocs: supportingDocs || null,
        status: 'PENDING'
      },
      include: { assignedTo: true }
    });

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(400).json({ error: 'Failed to create task' });
  }
});

app.patch('/api/tasks/:id/approve', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid task ID' });
    return;
  }

  const { notes, decisionNotes, decidedBy: customDecidedBy } = req.body as {
    notes?: string;
    decisionNotes?: string;
    decidedBy?: string;
  };
  const noteContent = (notes ?? decisionNotes)?.trim();

  try {
    const existing = await prisma.task.findUnique({
      where: { id },
      include: { assignedTo: true }
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const authUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { employee: true }
    });
    const decidedBy = customDecidedBy || authUser?.employee?.name || authUser?.email || 'HR Manager';

    // Trigger corresponding status updates on the associated employee if applicable (e.g. termination / review / leave)
    const actionTypeLower = (existing.actionType || '').toLowerCase();
    const titleLower = existing.title.toLowerCase();

    let newEmployeeStatus: Status | null = null;
    if (actionTypeLower === 'fire' || titleLower.includes('terminat')) {
      newEmployeeStatus = Status.TERMINATED;
    } else if (actionTypeLower === 'review' || titleLower.includes('review') || titleLower.includes('pip')) {
      newEmployeeStatus = Status.UNDER_REVIEW;
    } else if (actionTypeLower === 'leave' || titleLower.includes('leave')) {
      newEmployeeStatus = Status.ON_LEAVE;
    }

    if (newEmployeeStatus) {
      await prisma.employee.update({
        where: { id: existing.employeeId },
        data: { status: newEmployeeStatus }
      });
    }

    // Update task status and fetch updated employee
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'APPROVED',
        decidedBy,
        decidedDate: new Date(),
        decisionNotes: noteContent !== undefined && noteContent !== '' ? noteContent : existing.decisionNotes,
      },
      include: { assignedTo: true }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Approve task error:', error);
    res.status(500).json({ error: 'Failed to approve task' });
  }
});

app.patch('/api/tasks/:id/reject', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid task ID' });
    return;
  }

  const { notes, decisionNotes, decidedBy: customDecidedBy } = req.body as {
    notes?: string;
    decisionNotes?: string;
    decidedBy?: string;
  };
  const noteContent = (notes ?? decisionNotes)?.trim();

  try {
    const existing = await prisma.task.findUnique({
      where: { id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const authUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { employee: true }
    });
    const decidedBy = customDecidedBy || authUser?.employee?.name || authUser?.email || 'HR Manager';

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'REJECTED',
        decidedBy,
        decidedDate: new Date(),
        decisionNotes: noteContent !== undefined && noteContent !== '' ? noteContent : existing.decisionNotes,
      },
      include: { assignedTo: true }
    });

    res.json(updatedTask);
  } catch (error) {
    console.error('Reject task error:', error);
    res.status(500).json({ error: 'Failed to reject task' });
  }
});

app.patch('/api/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const updatedTask = await prisma.task.update({
      where: { id: Number(id) },
      data: req.body,
      include: { assignedTo: true }
    });
    res.json(updatedTask);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(400).json({ error: 'Failed to update task' });
  }
});

// ==========================================
// 3. INBOX / NOTIFICATION ENDPOINTS
// ==========================================
app.get('/api/inbox', async (req: Request, res: Response) => {
  try {
    const messages = await prisma.inboxMessage.findMany({ orderBy: { id: 'desc' } });
    res.json(messages);
  } catch (error) {
    console.error('Fetch inbox error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/inbox/:id/read', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const updatedMessage = await prisma.inboxMessage.update({
      where: { id: Number(id) },
      data: { unread: false }
    });
    res.json(updatedMessage);
  } catch (error) {
    console.error('Update inbox error:', error);
    res.status(400).json({ error: 'Failed to update message status' });
  }
});

// ==========================================
// 4. CALENDAR EVENT ENDPOINTS
// ==========================================
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const events = await prisma.calendarEvent.findMany();
    res.json(events);
  } catch (error) {
    console.error('Fetch events error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// 5. HR SETTINGS ENDPOINTS
// ==========================================
const DEFAULT_HR_SETTINGS = {
  performance: {
    excellentThreshold: 90,
    goodThreshold: 75,
    satisfactoryThreshold: 60,
    reviewCycleMonths: 6,
    probationPeriodDays: 90,
    terminationThreshold: 40,
    consecutiveMonthsForAction: 3,
  },
  scoring: {
    attendanceWeight: 30,
    tasksWeight: 40,
    behaviorWeight: 30,
    attendanceDeductionPerAbsence: 5,
    taskCompletionBonus: 10,
    behaviorIncidentDeduction: 15,
    maximumScore: 100,
    minimumScore: 0,
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    performanceAlerts: true,
    terminationAlerts: true,
    reviewReminders: true,
    dailyDigest: true,
    weeklyReports: true,
    notificationFrequency: 'immediate',
    digestTime: '09:00',
  },
  permissions: {
    hrManagers: {
      viewAllEmployees: true,
      editPerformance: true,
      initiateTermination: true,
      approveTermination: false,
      accessReports: true,
      manageUsers: false,
    },
    hrDirectors: {
      viewAllEmployees: true,
      editPerformance: true,
      initiateTermination: true,
      approveTermination: true,
      accessReports: true,
      manageUsers: true,
    },
    supervisors: {
      viewAllEmployees: false,
      editPerformance: true,
      initiateTermination: false,
      approveTermination: false,
      accessReports: false,
      manageUsers: false,
    },
  },
  general: {
    companyName: 'Acme Corporation',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    language: 'English',
    workingDays: 5,
    workingHoursPerDay: 8,
    fiscalYearStart: 'January',
  },
};

app.get('/api/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: 'hr_settings' },
    });

    if (!setting) {
      res.json(DEFAULT_HR_SETTINGS);
      return;
    }

    try {
      const parsed = JSON.parse(setting.value);
      res.json({ ...DEFAULT_HR_SETTINGS, ...parsed });
    } catch {
      res.json(DEFAULT_HR_SETTINGS);
    }
  } catch (error) {
    console.error('Fetch settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/settings', requireAuth, async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Invalid settings payload' });
      return;
    }

    const jsonValue = JSON.stringify(payload);

    const updated = await prisma.setting.upsert({
      where: { key: 'hr_settings' },
      update: { value: jsonValue },
      create: { key: 'hr_settings', value: jsonValue },
    });

    await prisma.hRSettings.upsert({
      where: { key: 'global' },
      update: { value: jsonValue },
      create: { key: 'global', value: jsonValue },
    }).catch((e) => console.error('Failed to sync HRSettings model:', e));

    res.json(JSON.parse(updated.value));
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==========================================
// 6. EMAIL DISPATCH ENDPOINTS
// ==========================================
app.post('/api/email/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const { to, subject, body, content, cc, bcc, metadata } = req.body;
    const emailBody = body ?? content;

    if (!to || !subject || !emailBody) {
      res.status(400).json({ error: 'to, subject, and body are required' });
      return;
    }

    const result = await sendEmail({
      to,
      subject,
      body: emailBody,
      cc,
      bcc,
      metadata,
    });

    res.json({
      success: true,
      message: 'Email dispatched successfully',
      ...result,
    });
  } catch (error) {
    console.error('Email dispatch error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to dispatch email',
    });
  }
});

// ==========================================
// 7. TIME & ATTENDANCE / LEAVE ENDPOINTS
// ==========================================

/**
 * GET /api/attendance
 * Query params: employeeId (optional), status (optional)
 * Protected.
 */
app.get('/api/attendance', requireAuth, async (req: Request, res: Response) => {
  try {
    const { employeeId, status } = req.query as { employeeId?: string; status?: string };

    const whereClause: Record<string, unknown> = {};
    if (employeeId && !isNaN(Number(employeeId))) {
      whereClause.employeeId = Number(employeeId);
    }
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const leaveRequests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
            avatar: true,
            status: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    res.json(leaveRequests);
  } catch (error) {
    console.error('Fetch attendance/leave error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/attendance
 * Body: { employeeId, type, startDate, endDate, reason, status? }
 * Protected.
 */
app.post('/api/attendance', requireAuth, async (req: Request, res: Response) => {
  try {
    const { employeeId, type, startDate, endDate, reason, status } = req.body;

    if (!employeeId || !type || !startDate || !endDate) {
      res.status(400).json({ error: 'employeeId, type, startDate, and endDate are required' });
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ error: 'Invalid startDate or endDate' });
      return;
    }

    if (end < start) {
      res.status(400).json({ error: 'endDate cannot be before startDate' });
      return;
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: Number(employeeId) },
    });
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    const newRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: Number(employeeId),
        type: String(type),
        startDate: start,
        endDate: end,
        reason: reason ? String(reason).trim() : null,
        status: status ? String(status).toUpperCase() : 'PENDING',
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
            avatar: true,
            status: true,
          },
        },
      },
    });

    res.status(201).json(newRequest);
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

/**
 * PATCH /api/attendance/:id
 * Body: { status: 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'PENDING', reason?: string }
 * Protected.
 */
app.patch('/api/attendance/:id', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid leave request ID' });
    return;
  }

  const { status, reason } = req.body as { status?: string; reason?: string };

  try {
    const existing = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Leave request not found' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (status) {
      const normalizedStatus = status.toUpperCase();
      updateData.status = normalizedStatus;

      // If approved, optionally adjust employee status if requested
      if (normalizedStatus === 'APPROVED') {
        const now = new Date();
        if (existing.startDate <= now && existing.endDate >= now) {
          await prisma.employee.update({
            where: { id: existing.employeeId },
            data: { status: Status.ON_LEAVE },
          });
        }
      }
    }
    if (reason !== undefined) {
      updateData.reason = reason;
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
            avatar: true,
            status: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update leave request error:', error);
    res.status(500).json({ error: 'Failed to update leave request' });
  }
});

// ==========================================
// 8. INCIDENTS ENDPOINTS
// ==========================================

/**
 * GET /api/incidents
 * Query params: employeeId (optional), severity (optional), status (optional)
 * Protected.
 */
app.get('/api/incidents', requireAuth, async (req: Request, res: Response) => {
  try {
    const { employeeId, severity, status } = req.query as {
      employeeId?: string;
      severity?: string;
      status?: string;
    };

    const whereClause: Record<string, unknown> = {};
    if (employeeId && !isNaN(Number(employeeId))) {
      whereClause.employeeId = Number(employeeId);
    }
    if (severity && severity !== 'ALL') {
      whereClause.severity = severity;
    }
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const incidents = await prisma.incidentRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
            avatar: true,
            status: true,
          },
        },
      },
      orderBy: { incidentDate: 'desc' },
    });

    res.json(incidents);
  } catch (error) {
    console.error('Fetch incidents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/incidents
 * Body: { employeeId, incidentDate, severity, description, status?, actionTaken?, reportedBy? }
 * Protected.
 */
app.post('/api/incidents', requireAuth, async (req: Request, res: Response) => {
  try {
    const { employeeId, incidentDate, severity, description, status, actionTaken, reportedBy } = req.body;

    if (!employeeId || !description || !severity) {
      res.status(400).json({ error: 'employeeId, description, and severity are required' });
      return;
    }

    const date = incidentDate ? new Date(incidentDate) : new Date();
    if (isNaN(date.getTime())) {
      res.status(400).json({ error: 'Invalid incidentDate' });
      return;
    }

    const employee = await prisma.employee.findUnique({
      where: { id: Number(employeeId) },
    });
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }

    // Default reportedBy from authenticated user if not provided
    const authUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { employee: true },
    });
    const finalReportedBy = reportedBy?.trim() || authUser?.employee?.name || authUser?.email || 'HR Department';

    const newIncident = await prisma.incidentRecord.create({
      data: {
        employeeId: Number(employeeId),
        incidentDate: date,
        severity: String(severity),
        description: String(description).trim(),
        status: status ? String(status).toUpperCase() : 'OPEN',
        actionTaken: actionTaken ? String(actionTaken).trim() : null,
        reportedBy: finalReportedBy,
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
            avatar: true,
            status: true,
          },
        },
      },
    });

    res.status(201).json(newIncident);
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({ error: 'Failed to create incident record' });
  }
});

/**
 * PATCH /api/incidents/:id
 * Body: { status?, actionTaken?, severity?, description? }
 * Protected.
 */
app.patch('/api/incidents/:id', requireAuth, async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid incident ID' });
    return;
  }

  const { status, actionTaken, severity, description } = req.body;

  try {
    const existing = await prisma.incidentRecord.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Incident record not found' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = String(status).toUpperCase();
    if (actionTaken !== undefined) updateData.actionTaken = actionTaken ? String(actionTaken).trim() : null;
    if (severity) updateData.severity = String(severity);
    if (description) updateData.description = String(description).trim();

    const updated = await prisma.incidentRecord.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
            avatar: true,
            status: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update incident error:', error);
    res.status(500).json({ error: 'Failed to update incident record' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});