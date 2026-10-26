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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 md:hidden" />
          <Separator orientation="vertical" className="mr-2 h-4 md:hidden" />

          {!isOverview && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="mr-2 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Separator orientation="vertical" className="mr-2 h-4" />
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
                    >
                      Dashboard
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
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
                  className="cursor-pointer"
                >
                  View Sample Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/performance-report')}
                  className="cursor-pointer"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Sample Report
                </Button>
                <Separator orientation="vertical" className="h-4" />
              </>
            )}

            {/* Logged-in user information */}
            <div className="flex items-center gap-2 text-sm">
              <UserCircle2 className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium hidden sm:inline">{user.name}</span>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {roleLabel[user.role] ?? user.role}
              </Badge>
            </div>

            {/* Logout button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive cursor-pointer"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {children ?? <Outlet />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
