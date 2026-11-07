# HR AI - Full-Stack Human Resource Automated System

A modern, production-ready, containerized Human Resource Management platform built with full-stack TypeScript, featuring role-based access control, automated workflows, time and attendance tracking, incident management, and an AI-powered HR assistant.

---

## Tech Stack

### Frontend
- **Framework:** React with Vite & TypeScript
- **Styling:** Tailwind CSS & Lucide React Icons
- **Routing:** React Router v6
- **Theme:** Persistent dark mode with theme state stored in `localStorage`

### Backend & Database
- **Runtime:** Node.js & Express (TypeScript)
- **Database & ORM:** PostgreSQL & Prisma ORM
- **Authentication:** JSON Web Tokens (JWT) & bcrypt password hashing
- **AI Integration:** Google Gemini API (`@google/genai`)
- **Email Service:** Nodemailer

### DevOps & Testing
- **Containerization:** Docker & Docker Compose
- **Testing:** Jest & Supertest
- **CI/CD:** GitHub Actions

---

## Key Features

- **Secure Authentication & RBAC:** JWT-protected routes and role-based access for administrators and employees.
- **Dynamic Employee Management:** Real-time directory, employee profiles, and supervisor notes.
- **Employee Directory Actions:** A 3-dots action dropdown menu on each row supports Edit, View Profile, and Delete/Deactivate actions.
- **CSV Data Export:** Download organization-wide employee reports directly from the UI.
- **Modern UI & Dark Mode:** Class-based dark mode with persistent theme state in `localStorage`.
- **Task & Approval Workflows:** Interactive action queues for reviewing and processing requests.
- **Time & Attendance:** Comprehensive tracking for employee work hours and attendance logs.
- **Incident Management:** Record, log, and resolve workplace incidents seamlessly.
- **AI-Powered HR Assistant:** Integrated Gemini API chatbot to answer employee policy and benefit queries dynamically.
- **Automated Notifications:** Backend email dispatch via Nodemailer for system updates and approvals.

---

## Accessing the App

When running the application locally with Docker Compose, use:

- **Frontend Interface:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

---
