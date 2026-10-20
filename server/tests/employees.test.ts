import request from 'supertest';
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
        role: 'Engineering Lead',
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
        role: 'Software Engineer',
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
