import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Status } from '@prisma/client';
import { mockPrisma } from './mocks/prisma';

jest.mock('../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { app } from '../src/index';

describe('PATCH /api/tasks/:id/approve', () => {
  const secret = process.env.JWT_SECRET || 'test-secret-key-for-testing';
  const validToken = jwt.sign(
    { userId: 1, email: 'admin@example.com', role: 'ADMIN' },
    secret
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when Authorization header is missing', async () => {
    const res = await request(app).patch('/api/tasks/1/approve').send({});

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Missing or malformed Authorization header' });
  });

  it('should return 401 when Authorization header is invalid', async () => {
    const res = await request(app)
      .patch('/api/tasks/1/approve')
      .set('Authorization', 'Bearer invalid-token')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid or expired token' });
  });

  it('should return 400 when task ID is not a number', async () => {
    const res = await request(app)
      .patch('/api/tasks/abc/approve')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid task ID' });
  });

  it('should return 404 when task is not found', async () => {
    mockPrisma.task.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/tasks/999/approve')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Task not found' });
  });

  it('should approve task without employee status change when actionType is standard', async () => {
    const existingTask = {
      id: 10,
      title: 'Submit Equipment Request',
      actionType: 'standard',
      employeeId: 5,
      decisionNotes: null,
      assignedTo: { id: 5, name: 'Alice Smith' },
    };

    mockPrisma.task.findUnique.mockResolvedValue(existingTask);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      employee: { name: 'Admin Manager' },
    });

    const updatedTask = {
      ...existingTask,
      status: 'APPROVED',
      decidedBy: 'Admin Manager',
      decidedDate: new Date(),
      decisionNotes: 'Looks good to approve',
    };
    mockPrisma.task.update.mockResolvedValue(updatedTask);

    const res = await request(app)
      .patch('/api/tasks/10/approve')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ notes: 'Looks good to approve' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');
    expect(res.body.decidedBy).toBe('Admin Manager');
    expect(mockPrisma.employee.update).not.toHaveBeenCalled();
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          status: 'APPROVED',
          decidedBy: 'Admin Manager',
          decisionNotes: 'Looks good to approve',
        }),
      })
    );
  });

  it('should update employee status to TERMINATED when actionType is fire', async () => {
    const existingTask = {
      id: 11,
      title: 'Contract Termination Process',
      actionType: 'fire',
      employeeId: 7,
      decisionNotes: null,
      assignedTo: { id: 7, name: 'Bob Jones' },
    };

    mockPrisma.task.findUnique.mockResolvedValue(existingTask);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      employee: null,
    });
    mockPrisma.employee.update.mockResolvedValue({ id: 7, status: Status.TERMINATED });
    mockPrisma.task.update.mockResolvedValue({
      ...existingTask,
      status: 'APPROVED',
      decidedBy: 'admin@example.com',
    });

    const res = await request(app)
      .patch('/api/tasks/11/approve')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: Status.TERMINATED },
    });
  });

  it('should update employee status to UNDER_REVIEW when actionType is review', async () => {
    const existingTask = {
      id: 12,
      title: 'Performance PIP Plan',
      actionType: 'review',
      employeeId: 8,
      decisionNotes: null,
      assignedTo: { id: 8, name: 'Charlie Lee' },
    };

    mockPrisma.task.findUnique.mockResolvedValue(existingTask);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.employee.update.mockResolvedValue({ id: 8, status: Status.UNDER_REVIEW });
    mockPrisma.task.update.mockResolvedValue({
      ...existingTask,
      status: 'APPROVED',
      decidedBy: 'HR Manager',
    });

    const res = await request(app)
      .patch('/api/tasks/12/approve')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { status: Status.UNDER_REVIEW },
    });
  });

  it('should update employee status to ON_LEAVE when actionType is leave', async () => {
    const existingTask = {
      id: 13,
      title: 'Maternity Leave Request',
      actionType: 'leave',
      employeeId: 9,
      decisionNotes: null,
      assignedTo: { id: 9, name: 'Dana White' },
    };

    mockPrisma.task.findUnique.mockResolvedValue(existingTask);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.employee.update.mockResolvedValue({ id: 9, status: Status.ON_LEAVE });
    mockPrisma.task.update.mockResolvedValue({
      ...existingTask,
      status: 'APPROVED',
      decidedBy: 'HR Manager',
    });

    const res = await request(app)
      .patch('/api/tasks/13/approve')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(mockPrisma.employee.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: { status: Status.ON_LEAVE },
    });
  });

  it('should return 500 when database update fails', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({
      id: 14,
      title: 'General Task',
      actionType: 'general',
      employeeId: 10,
    });
    mockPrisma.task.update.mockRejectedValue(new Error('Update failed'));

    const res = await request(app)
      .patch('/api/tasks/14/approve')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to approve task' });
  });
});
