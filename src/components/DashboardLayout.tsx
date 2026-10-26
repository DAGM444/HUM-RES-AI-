import React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { ArrowLeft, FileText, LogOut, UserCircle2 } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import { Badge } from './ui/badge';
import { AuthUser, clearAuth } from '../lib/auth';
import { ThemeToggle } from './ThemeToggle';

interface DashboardLayoutProps {
  user: AuthUser;
  onLogout: () => void;
  children?: React.ReactNode;
}

export function DashboardLayout({ user, onLogout, children }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  function handleLogout() {
    clearAuth();
    onLogout();
    navigate('/login');
  }

  const getBreadcrumbInfo = () => {
    if (currentPath === '/' || currentPath === '/dashboard') {
      return { title: 'Overview', isDashboard: true };
    }
    if (currentPath.startsWith('/attendance')) {
      return { title: 'Time & Attendance', isDashboard: false };
    }
    if (currentPath.startsWith('/incidents')) {
      return { title: 'Incidents & Disciplinary', isDashboard: false };
    }
    if (currentPath.startsWith('/employees/') || currentPath === '/employee-profile') {
      return { title: 'Employee Profile', isDashboard: false };
    }
    if (currentPath.startsWith('/employees')) {
      return { title: 'Employee Directory', isDashboard: false };
    }
    if (currentPath.startsWith('/pending-actions')) {
      return { title: 'Pending Actions & Approvals', isDashboard: false };
    }
    if (currentPath.startsWith('/email-templates')) {
      return { title: 'Email Templates', isDashboard: false };
    }
    if (currentPath.startsWith('/chatbot') || currentPath.startsWith('/employee-chatbot')) {
      return { title: 'HR Assistant', isDashboard: false };
    }
    if (currentPath.startsWith('/inbox') || currentPath.startsWith('/hr-inbox')) {
      return { title: 'HR Inbox', isDashboard: false };
    }
    if (currentPath.startsWith('/calendar') || currentPath.startsWith('/hr-calendar')) {
      return { title: 'HR Calendar', isDashboard: false };
    }
    if (currentPath.startsWith('/settings') || currentPath.startsWith('/hr-settings')) {
      return { title: 'HR Settings', isDashboard: false };
    }
    if (currentPath.startsWith('/reports') || currentPath.startsWith('/performance-reports')) {
      return { title: 'Performance Reports', isDashboard: false };
    }
    if (currentPath.startsWith('/performance-report')) {
      return { title: 'Performance Report', isDashboard: false };
    }
    if (currentPath.startsWith('/analytics') || currentPath.startsWith('/data-analytics')) {
      return { title: 'Data Analytics', isDashboard: false };
    }
    return { title: 'Dashboard', isDashboard: false };
  };

  const breadcrumb = getBreadcrumbInfo();
  const isOverview = breadcrumb.isDashboard;

  const roleLabel: Record<string, string> = {
    ADMIN: 'Admin',
    HR: 'HR',
    EMPLOYEE: 'Employee',
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 text-slate-900 dark:text-slate-100 sticky top-0 z-20">
          <SidebarTrigger className="-ml-1 md:hidden text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800" />
          <Separator orientation="vertical" className="mr-2 h-4 md:hidden border-slate-200 dark:border-slate-800" />

          {!isOverview && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="mr-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Separator orientation="vertical" className="mr-2 h-4 border-slate-200 dark:border-slate-800" />
            </>
          )}

          <Breadcrumb>
            <BreadcrumbList>
              {!isOverview && (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink
                      href="/dashboard"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/dashboard');
                      }}
                      className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-slate-400 dark:text-slate-600" />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-slate-900 dark:text-slate-100">{breadcrumb.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Right side header tools */}
          <div className="ml-auto flex items-center gap-2">
            {isOverview && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/employees/1')}
                  className="cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  View Sample Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/performance-report')}
                  className="cursor-pointer border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Sample Report
                </Button>
                <Separator orientation="vertical" className="h-4 border-slate-200 dark:border-slate-800" />
              </>
            )}

            {/* Dark mode / Light mode toggle */}
            <ThemeToggle />
            <Separator orientation="vertical" className="h-4 border-slate-200 dark:border-slate-800" />

            {/* Logged-in user information */}
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <UserCircle2 className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              <span className="font-medium hidden sm:inline">{user.name}</span>
              <Badge variant="secondary" className="hidden sm:inline-flex bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
                {roleLabel[user.role] ?? user.role}
              </Badge>
            </div>

            {/* Logout button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-500 hover:text-destructive dark:text-slate-400 dark:hover:text-destructive hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-[calc(100vh-4rem)]">
          {children ?? <Outlet />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
