import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './lib/prisma.js';
import { requireAuth } from './middleware/auth.js';
import { Status } from '@prisma/client';

const app = express();
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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
app.get('/api/tasks', async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany();
    res.json(tasks);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/tasks/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const updatedTask = await prisma.task.update({
      where: { id: Number(id) },
      data: req.body
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});