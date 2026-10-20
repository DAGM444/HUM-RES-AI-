import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma.js';
import { requireAuth } from './middleware/auth.js';
import { Status } from '@prisma/client';
import { sendEmail } from './lib/email.js';
import { generateAIChatResponse, buildHRSystemPrompt } from './lib/gemini.js';
import { GoogleGenAI } from '@google/genai';

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
// 7. AI HR ASSISTANT CHAT ENDPOINT
// ==========================================
/**
 * POST /api/chat
 * Protected with requireAuth.
 * Body: { message: string, history?: Array<{ role: string, content: string }> }
 * Calls Gemini LLM securely using GEMINI_API_KEY with company HR system instructions.
 */
app.post('/api/chat', requireAuth, async (req: Request, res: Response) => {
  const { message, history } = req.body as {
    message?: string;
    history?: Array<{ role: 'user' | 'model' | 'bot' | 'assistant'; content: string }>;
  };

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'A valid message string is required.' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_key_here' || apiKey === 'your-gemini-api-key-here') {
    res.status(503).json({
      error: 'GEMINI_API_KEY is not configured on the server. Please set a valid GEMINI_API_KEY in server/.env.',
    });
    return;
  }

  try {
    // 1. Initialize GoogleGenAI using process.env.GEMINI_API_KEY
    const ai = new GoogleGenAI({ apiKey });

    // 2. Resolve user context if authenticated
    let userContext = undefined;
    if (req.user?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { employee: true },
      });
      if (user) {
        userContext = {
          id: user.id,
          name: user.employee?.name ?? user.email,
          email: user.email,
          role: user.role,
          department: user.employee?.department,
        };
      }
    }

    // 3. System instruction defining assistant as a helpful HR policy guide for employees
    const systemInstruction = buildHRSystemPrompt(userContext);

    // 4. Format conversation contents for @google/genai
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history) && history.length > 0) {
      for (const item of history) {
        if (!item || typeof item.content !== 'string' || !item.content.trim()) continue;
        const role =
          item.role === 'model' || item.role === 'bot' || item.role === 'assistant'
            ? 'model'
            : 'user';
        contents.push({
          role,
          parts: [{ text: item.content.trim() }],
        });
      }
    }

    // Ensure the latest user prompt is at the end of the contents array
    const lastItem = contents[contents.length - 1];
    if (!lastItem || lastItem.role !== 'user' || lastItem.parts[0]?.text !== message.trim()) {
      contents.push({
        role: 'user',
        parts: [{ text: message.trim() }],
      });
    }

    // 5. Call the Gemini model (e.g. gemini-2.0-flash)
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || 'I apologize, but I could not generate a response.';
    res.json({ reply, message: reply });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    const errorMessage = error?.message || 'Failed to process chat message';
    const isApiKeyError =
      errorMessage.includes('GEMINI_API_KEY') ||
      errorMessage.includes('API_KEY') ||
      errorMessage.includes('API key');
    res.status(isApiKeyError ? 503 : 500).json({
      error: errorMessage,
    });
  }
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
export default app;