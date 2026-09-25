import { useState } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { Login } from './components/Login';
import { isAuthenticated, getStoredUser, AuthUser } from './lib/auth';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(
    isAuthenticated() ? getStoredUser() : null
  );

  function handleLoginSuccess(loggedInUser: AuthUser) {
    setUser(loggedInUser);
  }

  function handleLogout() {
    // clearAuth is called inside DashboardLayout; we just reset state here
    setUser(null);
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <DashboardLayout user={user} onLogout={handleLogout} />;
}