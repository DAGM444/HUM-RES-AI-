import { PrismaClient, Role, Status, Urgency, TaskType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing records (order matters — User, Task, and SupervisorNote reference Employee)
  await prisma.user.deleteMany();
  await prisma.supervisorNote.deleteMany();
  await prisma.task.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.incidentRecord.deleteMany();
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
  // Seed Tasks / Pending Actions
  // ------------------------------------------------------------------
  await prisma.task.createMany({
    data: [
      {
        title: 'Performance Review - Sarah Jenkins',
        actionType: 'review',
        reason: 'Quarterly leadership review and promotion eligibility assessment.',
        priority: 'medium',
        employeeId: manager.id,
        status: 'PENDING',
        dueDate: new Date('2026-06-25'),
        urgency: Urgency.MEDIUM,
        type: TaskType.REVIEW,
        initiatedBy: 'Executive Board',
        initiatorRole: 'Managing Director',
        supportingDocs: 'Performance Review Q2.pdf, Executive Feedback.pdf',
      },
      {
        title: 'Approve Leave Request - Alex Rivera',
        actionType: 'review',
        reason: 'Annual parental leave request for July 2026.',
        priority: 'low',
        employeeId: employee.id,
        status: 'PENDING',
        dueDate: new Date('2026-06-24'),
        urgency: Urgency.LOW,
        type: TaskType.APPROVAL,
        initiatedBy: 'Alex Rivera',
        initiatorRole: 'Software Engineer',
        supportingDocs: 'Leave Application.pdf',
      },
      {
        title: 'Disciplinary Investigation - Termination Consideration',
        actionType: 'fire',
        reason: 'Repeated non-compliance with data safety policies and multiple written warnings.',
        priority: 'high',
        employeeId: employee.id,
        status: 'PENDING',
        dueDate: new Date('2026-06-28'),
        urgency: Urgency.HIGH,
        type: TaskType.APPROVAL,
        initiatedBy: 'Sarah Jenkins',
        initiatorRole: 'HR Director',
        supportingDocs: 'Incident Report.pdf, Security Audit.pdf',
      },
      {
        title: 'Promotion to Senior HR Specialist',
        actionType: 'review',
        reason: 'Exceptional performance during departmental audit and systems migration.',
        priority: 'medium',
        employeeId: manager.id,
        status: 'APPROVED',
        dueDate: new Date('2026-05-10'),
        urgency: Urgency.MEDIUM,
        type: TaskType.REVIEW,
        initiatedBy: 'Executive Board',
        initiatorRole: 'Managing Director',
        decidedBy: 'Executive HR',
        decidedDate: new Date('2026-05-12'),
        decisionNotes: 'Promotion approved unanimously. Compensation adjustment verified.',
      },
      {
        title: 'Contract Termination Request - Contingent Worker',
        actionType: 'fire',
        reason: 'Project phase completed ahead of schedule.',
        priority: 'low',
        employeeId: employee.id,
        status: 'REJECTED',
        dueDate: new Date('2026-05-01'),
        urgency: Urgency.LOW,
        type: TaskType.APPROVAL,
        initiatedBy: 'Operations Lead',
        initiatorRole: 'Operations',
        decidedBy: 'Sarah Jenkins',
        decidedDate: new Date('2026-05-02'),
        decisionNotes: 'Contract extended by 3 months to cover phase 2 implementation.',
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

  // ------------------------------------------------------------------
  // Seed Leave Requests
  // ------------------------------------------------------------------
  await prisma.leaveRequest.createMany({
    data: [
      {
        employeeId: employee.id,
        type: 'Parental Leave',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2026-07-21'),
        status: 'PENDING',
        reason: 'Welcoming newborn child and primary bonding leave.',
      },
      {
        employeeId: manager.id,
        type: 'Annual Leave',
        startDate: new Date('2026-08-10'),
        endDate: new Date('2026-08-18'),
        status: 'APPROVED',
        reason: 'Summer family vacation.',
      },
      {
        employeeId: employee.id,
        type: 'Sick Leave',
        startDate: new Date('2026-05-12'),
        endDate: new Date('2026-05-14'),
        status: 'APPROVED',
        reason: 'Seasonal respiratory infection recovery.',
      },
      {
        employeeId: employee.id,
        type: 'Unpaid Leave',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-05'),
        status: 'REJECTED',
        reason: 'Personal travel overlap with core sprint deliverables.',
      },
    ],
  });

  // ------------------------------------------------------------------
  // Seed Incident Records
  // ------------------------------------------------------------------
  await prisma.incidentRecord.createMany({
    data: [
      {
        employeeId: employee.id,
        incidentDate: new Date('2026-06-15T14:30:00'),
        severity: 'High',
        description: 'Repeated non-compliance with data safety policies and unencrypted client data export.',
        status: 'INVESTIGATING',
        actionTaken: 'Formal security audit opened. Supervised credentials assigned.',
        reportedBy: 'Sarah Jenkins (HR Director)',
      },
      {
        employeeId: manager.id,
        incidentDate: new Date('2026-05-20T09:15:00'),
        severity: 'Low',
        description: 'Scheduling conflict disagreement escalated during executive standup meeting.',
        status: 'RESOLVED',
        actionTaken: 'Informal mediation completed; calendar sync protocols clarified.',
        reportedBy: 'Executive Board',
      },
      {
        employeeId: employee.id,
        incidentDate: new Date('2026-04-10T11:00:00'),
        severity: 'Medium',
        description: 'Missed mandatory annual compliance training deadline after 3 automated reminders.',
        status: 'RESOLVED',
        actionTaken: 'Training completed under supervisor monitoring; warning logged.',
        reportedBy: 'Compliance Automated Sentinel',
      },
      {
        employeeId: employee.id,
        incidentDate: new Date('2026-06-28T16:45:00'),
        severity: 'Critical',
        description: 'Unauthorized privilege escalation probe detected on internal microservices cluster.',
        status: 'OPEN',
        actionTaken: 'SecOps containment in progress; HR disciplinary review pending.',
        reportedBy: 'SecOps Automated Alert',
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