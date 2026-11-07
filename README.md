#  HR AI - Full-Stack Human Resource Automated System

A modern, production-ready, containerized Human Resource Management platform built with full-stack TypeScript, featuring role-based access control, automated workflows, time & attendance tracking, incident management, an integrated AI chatbot, persistent dark mode UI/UX, and robust CI/CD pipelines.

---

## Tech Stack

### Frontend
* **Framework:** React with Vite & TypeScript
* **Styling:** Tailwind CSS & Lucide React Icons
* **Routing:** React Router v6
* **UI/UX:** Custom design tokens with persistent class-based Dark Mode (`localStorage`)

### Backend & Database
* **Runtime:** Node.js & Express (TypeScript)
* **Database & ORM:** PostgreSQL & Prisma ORM
* **Authentication:** JSON Web Tokens (JWT) & bcrypt password hashing
* **AI Integration:** Google Gemini API (`@google/genai`)
* **Email Service:** Nodemailer

### DevOps & Testing
* **Containerization:** Docker & Docker Compose
* **Testing:** Jest & Supertest (Backend API) / Vitest (Frontend Components)
* **CI/CD:** GitHub Actions

---

##  Key Features

*  Secure Authentication & RBAC:** JWT-protected routes and role-based access control for administrators, HR staff, and general employees.
*  Dynamic Employee Directory:
    * Real-time employee directory with advanced search and filtering.
    * Interactive **Add Employee Modal** with client/server validation and optimistic UI updates.
    * **3-Dots Action Dropdown Menu** per row supporting Edit, View Profile, and Delete/Deactivate actions.
    * **CSV Data Export Engine** to download organization-wide employee reports directly from the UI.
*   Modern UI & Dark Mode:** Sleek slate/zinc professional palette with a smooth light/dark mode switcher that persists across user sessions.
*  Task & Approval Workflows:** Interactive action queues for reviewing and processing organizational requests.
*  Time & Attendance:** Comprehensive tracking for employee work hours, attendance logs, and leave requests.
*  Incident Management:** Record, log, track, and resolve workplace incidents seamlessly.
*  AI-Powered HR Assistant:** Integrated Gemini API chatbot trained to respond dynamically to employee policy, benefits, and structural queries.
*  Automated Notifications:** Backend email dispatch via Nodemailer for system updates, status changes, and approvals.

---

##  Docker Deployment (Recommended)

The quickest way to launch the full-stack system locally or on a production host is via **Docker Compose**.

### Prerequisites
* [Docker](https://docs.docker.com/get-docker/) and Docker Compose installed.

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DAGM444/HUM-RES-AI-.git
   cd HUM-RES-AI-
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in your `server` directory containing:
   ```env
   DATABASE_URL="postgresql://postgres:password@postgres:5432/hr_db?schema=public"
   JWT_SECRET="your_secure_jwt_secret"
   GEMINI_API_KEY="your_google_gemini_api_key"
   ```

3. **Build and Run Containers:**
   ```bash
   docker compose up --build -d
   ```

4. **Access the Web Services:**
   * **Frontend Interface:** http://localhost:3000
   * **Backend REST API:** http://localhost:5000

---

##  Local Development Setup

To run the frontend and backend in development mode with hot reloading:

### 1. Database & Backend Setup
```bash
cd server
npm install
npx prisma db push
npm run dev
```

### 2. Frontend Setup
```bash
# In a separate terminal window from the root directory
npm install
npm run dev
```

---

##  Running Automated Test Suites

### Backend Tests (Jest & Supertest)
```bash
cd server
npm test
```

### Frontend Tests (Vitest & Testing Library)
```bash
npm run test
```

---

##  License

This project is open-source and available under the [MIT License](LICENSE).
