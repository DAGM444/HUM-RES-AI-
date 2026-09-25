import { PrismaClient, Role, Status, Urgency, TaskType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing records (order matters — User, Task, and SupervisorNote reference Employee)
  await prisma.user.deleteMany();
  await prisma.supervisorNote.deleteMany();
  await prisma.task.deleteMany();
  await prisma.inboxMessage.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.employee.deleteMany();

  // ------------------------------------------------------------------
  // Seed Employees
  // ------------------------------------------------------------------
  const manager = await prisma.employee.create({
    data: {
      name: 'Sarah Jenkins',
      email: 'sarah.j@company.com',
      role: Role.HR,
      department: 'Human Resources',
      performanceScore: 4.8,
      status: Status.ACTIVE,
      joinDate: new Date('2022-01-15'),
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      location: 'New York',
    },
  });

  const employee = await prisma.employee.create({
    data: {
      name: 'Alex Rivera',
      email: 'alex.r@company.com',
      role: Role.EMPLOYEE,
      department: 'Engineering',
      performanceScore: 4.2,
      status: Status.ACTIVE,
      joinDate: new Date('2024-03-10'),
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      location: 'Remote',
      managerId: manager.id,
    },
  });

  // ------------------------------------------------------------------
  // Seed Default Users (with hashed passwords)
  // ------------------------------------------------------------------
  const SALT_ROUNDS = 10;

  // Admin / HR login — hr@company.com / password123
  await prisma.user.create({
    data: {
      email: 'hr@company.com',
      password: await bcrypt.hash('password123', SALT_ROUNDS),
      role: Role.HR,
      employeeId: manager.id,
    },
  });

  // Secondary employee login
  await prisma.user.create({
    data: {
      email: 'alex.r@company.com',
      password: await bcrypt.hash('password123', SALT_ROUNDS),
      role: Role.EMPLOYEE,
      employeeId: employee.id,
    },
  });

  // Admin user (no linked employee)
  await prisma.user.create({
    data: {
      email: 'admin@company.com',
      password: await bcrypt.hash('admin1234', SALT_ROUNDS),
      role: Role.ADMIN,
    },
  });

  // ------------------------------------------------------------------
  // Seed Tasks
  // ------------------------------------------------------------------
  await prisma.task.createMany({
    data: [
      {
        title: 'Review Q2 Performance Logs',
        employeeId: manager.id,
        status: 'Pending',
        dueDate: new Date('2026-06-25'),
        urgency: Urgency.HIGH,
        type: TaskType.PERFORMANCE,
      },
      {
        title: 'Approve Leave Request - Alex',
        employeeId: manager.id,
        status: 'Pending',
        dueDate: new Date('2026-06-24'),
        urgency: Urgency.MEDIUM,
        type: TaskType.APPROVAL,
      },
    ],
  });

  // ------------------------------------------------------------------
  // Seed Supervisor Notes
  // ------------------------------------------------------------------
  await prisma.supervisorNote.createMany({
    data: [
      {
        employeeId: employee.id,
        author: manager.name,
        note: 'Alex has shown strong progress on the system architecture. Recommended for leadership training.',
      },
      {
        employeeId: manager.id,
        author: 'Executive HR',
        note: 'Sarah continues to exceed leadership metrics for department oversight and quarterly targets.',
      },
    ],
  });

  // ------------------------------------------------------------------
  // Seed Inbox Messages
  // ------------------------------------------------------------------
  await prisma.inboxMessage.createMany({
    data: [
      {
        sender: 'System Notification',
        senderRole: Role.ADMIN,
        content: 'Database integration complete via secure workspace pipeline.',
        unread: true,
        avatar: '',
      },
    ],
  });

  // ------------------------------------------------------------------
  // Seed Calendar Events
  // ------------------------------------------------------------------
  await prisma.calendarEvent.createMany({
    data: [
      {
        title: 'Engineering Synced Status',
        type: 'Meeting',
        eventDate: new Date('2026-06-24T10:00:00'),
        attendee: 'Alex Rivera',
      },
    ],
  });

  console.log('✅ Database successfully seeded!');
  console.log('   HR login:    hr@company.com   / password123');
  console.log('   Admin login: admin@company.com / admin1234');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });