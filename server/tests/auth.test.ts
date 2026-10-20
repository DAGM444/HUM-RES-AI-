import request from 'supertest';
import bcrypt from 'bcryptjs';
import { mockPrisma } from './mocks/prisma';

jest.mock('../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import { app } from '../src/index';

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if email or password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'email and password are required' });
  });

  it('should return 401 if user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'nonexistent@example.com' },
      include: { employee: true },
    });
  });

  it('should return 401 if password does not match', async () => {
    const hashedPassword = await bcrypt.hash('correct-password', 10);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      password: hashedPassword,
      role: 'ADMIN',
      employee: { name: 'Admin User' },
      employeeId: 10,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
  });

  it('should return 200 with JWT token and user info on successful login', async () => {
    const rawPassword = 'secretPassword123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'ADMIN',
      employee: { name: 'Admin Name' },
      employeeId: 101,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: rawPassword });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toEqual({
      id: 1,
      email: 'admin@example.com',
      role: 'ADMIN',
      name: 'Admin Name',
      employeeId: 101,
    });
  });

  it('should return 500 when database throws an error', async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB failure'));

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'pass' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
