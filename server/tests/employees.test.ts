import request from 'supertest';
import jwt from 'jsonwebtoken';
import { mockPrisma } from './mocks/prisma';

jest.mock('../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { app } from '../src/index';

describe('GET /api/employees', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a list of employees with manager and subordinates', async () => {
    const mockEmployeeList = [
      {
        id: 1,
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'EMPLOYEE',
        department: 'Engineering',
        managerId: null,
        manager: null,
        subordinates: [
          { id: 2, name: 'John Smith', email: 'john@example.com' }
        ],
      },
      {
        id: 2,
        name: 'John Smith',
        email: 'john@example.com',
        role: 'EMPLOYEE',
        department: 'Engineering',
        managerId: 1,
        manager: { id: 1, name: 'Jane Doe' },
        subordinates: [],
      },
    ];

    mockPrisma.employee.findMany.mockResolvedValue(mockEmployeeList);

    const res = await request(app).get('/api/employees');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockEmployeeList);
    expect(mockPrisma.employee.findMany).toHaveBeenCalledWith({
      include: { manager: true, subordinates: true },
    });
  });

  it('should return an empty array when no employees exist', async () => {
    mockPrisma.employee.findMany.mockResolvedValue([]);

    const res = await request(app).get('/api/employees');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should return 500 when database throws an error', async () => {
    mockPrisma.employee.findMany.mockRejectedValue(new Error('DB Connection Timeout'));

    const res = await request(app).get('/api/employees');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});

describe('POST /api/employees', () => {
  const secret = process.env.JWT_SECRET || 'test-secret-key-for-testing';
  const validToken = jwt.sign(
    { userId: 1, email: 'admin@example.com', role: 'ADMIN' },
    secret
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when Authorization header is missing', async () => {
    const res = await request(app).post('/api/employees').send({
      name: 'Test Employee',
      email: 'test@example.com',
      role: 'EMPLOYEE',
      department: 'Engineering',
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Missing or malformed Authorization header' });
  });

  it('should return 401 when Authorization header is invalid', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', 'Bearer invalid-token')
      .send({
        name: 'Test Employee',
        email: 'test@example.com',
        role: 'EMPLOYEE',
        department: 'Engineering',
      });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid or expired token' });
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        email: 'test@example.com',
        role: 'EMPLOYEE',
        department: 'Engineering',
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Name is required' });
  });

  it('should return 400 when email is invalid', async () => {
    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'Test Employee',
        email: 'not-an-email',
        role: 'EMPLOYEE',
        department: 'Engineering',
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'A valid email address is required' });
  });

  it('should return 409 when email already exists', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue({ id: 1, email: 'existing@example.com' });

    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'Test Employee',
        email: 'existing@example.com',
        role: 'EMPLOYEE',
        department: 'Engineering',
      });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'An employee with this email already exists' });
  });

  it('should return 400 when role is invalid', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'Test Employee',
        email: 'test@example.com',
        role: 'INVALID_ROLE',
        department: 'Engineering',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid role');
  });

  it('should return 400 when department is missing', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'Test Employee',
        email: 'test@example.com',
        role: 'EMPLOYEE',
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Department is required' });
  });

  it('should return 400 when performance score is out of bounds', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'Test Employee',
        email: 'test@example.com',
        role: 'EMPLOYEE',
        department: 'Engineering',
        performanceScore: 6,
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Performance score must be a number between 0 and 5' });
  });

  it('should return 400 when manager does not exist', async () => {
    mockPrisma.employee.findUnique
      .mockResolvedValueOnce(null) // email check
      .mockResolvedValueOnce(null); // manager check

    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'Test Employee',
        email: 'test@example.com',
        role: 'EMPLOYEE',
        department: 'Engineering',
        managerId: 999,
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Specified manager does not exist' });
  });

  it('should successfully create an employee and return 201', async () => {
    mockPrisma.employee.findUnique
      .mockResolvedValueOnce(null) // email check
      .mockResolvedValueOnce({ id: 10, name: 'Manager Bob' }); // manager check

    const createdEmployee = {
      id: 20,
      name: 'New Person',
      email: 'newperson@example.com',
      role: 'EMPLOYEE',
      department: 'Engineering',
      status: 'ACTIVE',
      performanceScore: 4.5,
      joinDate: new Date('2026-01-01'),
      location: 'Remote',
      avatar: 'https://avatar.url',
      managerId: 10,
      manager: { id: 10, name: 'Manager Bob' },
      subordinates: [],
    };

    mockPrisma.employee.create.mockResolvedValue(createdEmployee);

    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'New Person',
        email: 'newperson@example.com',
        role: 'EMPLOYEE',
        department: 'Engineering',
        performanceScore: 4.5,
        status: 'ACTIVE',
        joinDate: '2026-01-01',
        location: 'Remote',
        avatar: 'https://avatar.url',
        managerId: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      ...createdEmployee,
      joinDate: createdEmployee.joinDate.toISOString(),
    });
    expect(mockPrisma.employee.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'New Person',
        email: 'newperson@example.com',
        role: 'EMPLOYEE',
        department: 'Engineering',
        performanceScore: 4.5,
        status: 'ACTIVE',
        location: 'Remote',
        managerId: 10,
      }),
      include: {
        manager: true,
        subordinates: true,
      },
    });
  });

  it('should return 500 when database throws an unexpected error', async () => {
    mockPrisma.employee.findUnique.mockResolvedValue(null);
    mockPrisma.employee.create.mockRejectedValue(new Error('DB Error'));

    const res = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        name: 'Test Person',
        email: 'test@example.com',
        role: 'HR',
        department: 'Human Resources',
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to create employee' });
  });
});
