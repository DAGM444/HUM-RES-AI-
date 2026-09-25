import { useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Dashboard } from './Dashboard';
import { EmployeeProfile } from './EmployeeProfile';
import { PerformanceReport } from './PerformanceReport';
import { PendingActions } from './PendingActions';
import { EmailTemplates } from './EmailTemplates';
import { EmployeeChatbot } from './EmployeeChatbot';
import { HRInbox } from './HRInbox';
import { HRCalendar } from './HRCalendar';
import { HRSettings } from './HRSettings';
import { EmployeeDirectory } from './EmployeeDirectory';
import { PerformanceReportsList } from './PerformanceReportsList';
import { DataAnalytics } from './DataAnalytics';
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

import { View, ViewState } from '../../types/view';
import { AuthUser, clearAuth } from '../lib/auth';

interface DashboardLayoutProps {
  user: AuthUser;
  onLogout: () => void;
}

export function DashboardLayout({ user, onLogout }: DashboardLayoutProps) {
  const [viewState, setViewState] = useState<ViewState>({ view: 'dashboard' });
  const currentView = viewState.view;
  const activeEmployeeId = viewState.view === 'employee-profile' ? viewState.employeeId : undefined;

  function handleLogout() {
    clearAuth();
    onLogout();
  }

  /** Navigate to any view; accepts either a view string with optional employeeId or a ViewState object (e.g. { view: 'employee-profile', employeeId: 1 }) */
  function navigateTo(target: View | ViewState, employeeId?: number) {
    if (typeof target === 'string') {
      if (target === 'employee-profile') {
        setViewState({ view: 'employee-profile', employeeId });
      } else {
        setViewState({ view: target });
      }
    } else {
      setViewState(target);
    }
  }

  const renderContent = () => {
    switch (currentView) {
      case 'employee-profile':
        return <EmployeeProfile employeeId={activeEmployeeId} />;
      case 'performance-report':
        return <PerformanceReport />;
      case 'pending-actions':
        return (
          <PendingActions
            onNavigateToEmailTemplates={() => navigateTo('email-templates')}
          />
        );
      case 'email-templates':
        return <EmailTemplates />;
      case 'employee-chatbot':
        return <EmployeeChatbot />;
      case 'hr-inbox':
        return (
          <HRInbox
            onNavigateToProfile={() => navigateTo('employee-profile')}
            onNavigateToPendingActions={() => navigateTo('pending-actions')}
          />
        );
      case 'hr-calendar':
        return <HRCalendar onNavigateToProfile={() => navigateTo('employee-profile')} />;
      case 'hr-settings':
        return <HRSettings onNavigateToProfile={() => navigateTo('employee-profile')} />;
      case 'employee-directory':
        return (
          <EmployeeDirectory
            onNavigateToProfile={(id) => navigateTo('employee-profile', id)}
            onNavigateToReport={() => navigateTo('performance-report')}
          />
        );
      case 'performance-reports-list':
        return (
          <PerformanceReportsList
            onNavigateToReport={() => navigateTo('performance-report')}
          />
        );
      case 'data-analytics':
        return <DataAnalytics />;
      default:
        return (
          <Dashboard
            onNavigateToProfile={() => navigateTo('employee-profile')}
            onNavigateToReport={() => navigateTo('performance-report')}
            onNavigateToPendingActions={() => navigateTo('pending-actions')}
            onNavigateToChatbot={() => navigateTo('employee-chatbot')}
            onNavigateToCalendar={() => navigateTo('hr-calendar')}
            onNavigateToSettings={() => navigateTo('hr-settings')}
            onNavigateToDirectory={() => navigateTo('employee-directory')}
          />
        );
    }
  };

  const getBreadcrumb = () => {
    const breadcrumbMap: Record<View, string> = {
      'dashboard':               'Overview',
      'employee-profile':        'Employee Profile',
      'performance-report':      'Performance Report',
      'pending-actions':         'Pending Actions',
      'email-templates':         'Email Templates',
      'employee-chatbot':        'HR Assistant',
      'hr-inbox':                'HR Inbox',
      'hr-calendar':             'HR Calendar',
      'hr-settings':             'HR Settings',
      'employee-directory':      'Employee Directory',
      'performance-reports-list':'Performance Reports',
      'data-analytics':          'Data Analytics',
    };

    return (
      <Breadcrumb>
        <BreadcrumbList>
          {currentView !== 'dashboard' && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="#" onClick={() => navigateTo('dashboard')}>
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          <BreadcrumbItem>
            <BreadcrumbPage>{breadcrumbMap[currentView]}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  const roleLabel: Record<string, string> = { ADMIN: 'Admin', HR: 'HR', EMPLOYEE: 'Employee' };

  return (
    <SidebarProvider>
      <AppSidebar onNavigate={(view) => navigateTo(view as View)} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          {currentView !== 'dashboard' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateTo('dashboard')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Separator orientation="vertical" className="mr-2 h-4" />
            </>
          )}

          {getBreadcrumb()}

          {/* Right side */}
          <div className="ml-auto flex items-center gap-2">
            {currentView === 'dashboard' && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigateTo({ view: 'employee-profile', employeeId: user.employeeId ?? 1 })}>
                  View Sample Profile
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateTo('performance-report')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Sample Report
                </Button>
                <Separator orientation="vertical" className="h-4" />
              </>
            )}

            {/* Logged-in user info */}
            <div className="flex items-center gap-2 text-sm">
              <UserCircle2 className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium hidden sm:inline">{user.name}</span>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {roleLabel[user.role] ?? user.role}
              </Badge>
            </div>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          {renderContent()}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
