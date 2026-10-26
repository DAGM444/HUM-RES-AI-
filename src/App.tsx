import React, { useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { DashboardLayout } from './components/DashboardLayout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { EmployeeDirectory } from './components/EmployeeDirectory';
import { EmployeeProfile } from './components/EmployeeProfile';
import { TimeAttendance } from './components/TimeAttendance';
import { Incidents } from './components/Incidents';
import { PendingActions } from './components/PendingActions';
import { EmailTemplates } from './components/EmailTemplates';
import { EmployeeChatbot } from './components/EmployeeChatbot';
import { HRInbox } from './components/HRInbox';
import { HRCalendar } from './components/HRCalendar';
import { HRSettings } from './components/HRSettings';
import { PerformanceReportsList } from './components/PerformanceReportsList';
import { PerformanceReport } from './components/PerformanceReport';
import { DataAnalytics } from './components/DataAnalytics';
import { isAuthenticated, getStoredUser, AuthUser } from './lib/auth';
import { ThemeProvider } from './lib/theme';

function LoginPage({
  user,
  onLoginSuccess,
}: {
  user: AuthUser | null;
  onLoginSuccess: (u: AuthUser) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  if (user || isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    '/dashboard';

  return (
    <Login
      onLoginSuccess={(loggedInUser) => {
        onLoginSuccess(loggedInUser);
        navigate(from, { replace: true });
      }}
    />
  );
}

function ProtectedRoutes({
  user,
  onLogout,
}: {
  user: AuthUser | null;
  onLogout: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  if (!user && !isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const currentUser = user || getStoredUser()!;

  return (
    <DashboardLayout user={currentUser} onLogout={onLogout}>
      <Routes>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <Dashboard
              onNavigateToProfile={() => navigate('/employee-profile')}
              onNavigateToReport={() => navigate('/performance-report')}
              onNavigateToPendingActions={() => navigate('/pending-actions')}
              onNavigateToChatbot={() => navigate('/chatbot')}
              onNavigateToCalendar={() => navigate('/calendar')}
              onNavigateToSettings={() => navigate('/settings')}
              onNavigateToDirectory={() => navigate('/employees')}
            />
          }
        />
        <Route
          path="employees"
          element={
            <EmployeeDirectory
              onNavigateToProfile={(id) => navigate(`/employees/${id}`)}
              onNavigateToReport={() => navigate('/performance-report')}
            />
          }
        />
        <Route path="employees/:id" element={<EmployeeProfile />} />
        <Route path="employee-profile" element={<EmployeeProfile />} />
        <Route path="employee-profile/:id" element={<EmployeeProfile />} />
        <Route path="attendance" element={<TimeAttendance />} />
        <Route
          path="time-attendance"
          element={<Navigate to="/attendance" replace />}
        />
        <Route path="incidents" element={<Incidents />} />
        <Route
          path="pending-actions"
          element={
            <PendingActions
              onNavigateToEmailTemplates={() => navigate('/email-templates')}
            />
          }
        />
        <Route path="email-templates" element={<EmailTemplates />} />
        <Route path="chatbot" element={<EmployeeChatbot />} />
        <Route
          path="employee-chatbot"
          element={<Navigate to="/chatbot" replace />}
        />
        <Route
          path="inbox"
          element={
            <HRInbox
              onNavigateToProfile={() => navigate('/employee-profile')}
              onNavigateToPendingActions={() => navigate('/pending-actions')}
            />
          }
        />
        <Route path="hr-inbox" element={<Navigate to="/inbox" replace />} />
        <Route
          path="calendar"
          element={
            <HRCalendar
              onNavigateToProfile={() => navigate('/employee-profile')}
            />
          }
        />
        <Route path="hr-calendar" element={<Navigate to="/calendar" replace />} />
        <Route
          path="settings"
          element={
            <HRSettings
              onNavigateToProfile={() => navigate('/employee-profile')}
            />
          }
        />
        <Route path="hr-settings" element={<Navigate to="/settings" replace />} />
        <Route
          path="reports"
          element={
            <PerformanceReportsList
              onNavigateToReport={() => navigate('/performance-report')}
            />
          }
        />
        <Route
          path="performance-reports"
          element={<Navigate to="/reports" replace />}
        />
        <Route
          path="performance-reports-list"
          element={<Navigate to="/reports" replace />}
        />
        <Route path="performance-report" element={<PerformanceReport />} />
        <Route path="analytics" element={<DataAnalytics />} />
        <Route
          path="data-analytics"
          element={<Navigate to="/analytics" replace />}
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(
    isAuthenticated() ? getStoredUser() : null
  );

  function handleLoginSuccess(loggedInUser: AuthUser) {
    setUser(loggedInUser);
  }

  function handleLogout() {
    setUser(null);
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <LoginPage user={user} onLoginSuccess={handleLoginSuccess} />
            }
          />
          <Route
            path="/*"
            element={<ProtectedRoutes user={user} onLogout={handleLogout} />}
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}