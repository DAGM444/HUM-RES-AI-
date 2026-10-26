import {
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  Users,
  FileText,
  BarChart3,
  Clock,
  UserCheck,
  AlertTriangle,
  Building2,
  Mail,
  MessageCircle,
  ChevronLeft,
  PanelLeft,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from './ui/sidebar';
import { Button } from './ui/button';

// Primary application navigation items (Employee Directory removed from Application to avoid duplication)
const items = [
  {
    title: 'Home',
    icon: Home,
    path: '/dashboard',
  },
  {
    title: 'HR Assistant',
    icon: MessageCircle,
    path: '/chatbot',
  },
  {
    title: 'Search',
    icon: Search,
    path: '/employees',
  },
  {
    title: 'Inbox',
    icon: Inbox,
    path: '/inbox',
  },
  {
    title: 'Calendar',
    icon: Calendar,
    path: '/calendar',
  },
  {
    title: 'Settings',
    icon: Settings,
    path: '/settings',
  },
];

// HR function-specific navigation items (Employee Directory kept under HR Functions)
const hrItems = [
  {
    title: 'Employee Directory',
    icon: Users,
    path: '/employees',
  },
  {
    title: 'Performance Reports',
    icon: FileText,
    path: '/reports',
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    path: '/analytics',
  },
  {
    title: 'Time & Attendance',
    icon: Clock,
    path: '/attendance',
  },
  {
    title: 'Approvals',
    icon: UserCheck,
    path: '/pending-actions',
  },
  {
    title: 'Email Templates',
    icon: Mail,
    path: '/email-templates',
  },
  {
    title: 'Incidents',
    icon: AlertTriangle,
    path: '/incidents',
  },
];

export interface AppSidebarProps {
  onNavigate?: (path: string) => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const handleItemClick = (path: string) => {
    navigate(path);
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const isItemActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-slate-200 dark:border-slate-800">
        {isCollapsed ? (
          <div className="flex items-center justify-center py-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-8 w-8 text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-lg"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 py-1 w-full">
            <div
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
              onClick={() => handleItemClick('/dashboard')}
              title="HR Management"
            >
              <Building2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                HR Management
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="h-7 w-7 shrink-0 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-lg"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed ? (
            <SidebarGroupLabel>Application</SidebarGroupLabel>
          ) : (
            <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item, index) => {
                const active = isItemActive(item.path);
                return (
                  <SidebarMenuItem key={`app-${item.title}-${index}`}>
                    <SidebarMenuButton
                      onClick={() => handleItemClick(item.path)}
                      title={item.title}
                      className={`cursor-pointer transition-colors ${
                        active
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <item.icon className={`shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                      {!isCollapsed && <span className="truncate">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!isCollapsed ? (
            <SidebarGroupLabel>HR Functions</SidebarGroupLabel>
          ) : (
            <div className="my-1 border-t border-slate-200 dark:border-slate-800" />
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {hrItems.map((item, index) => {
                const active = isItemActive(item.path);
                return (
                  <SidebarMenuItem key={`hr-${item.title}-${index}`}>
                    <SidebarMenuButton
                      onClick={() => handleItemClick(item.path)}
                      title={item.title}
                      className={`cursor-pointer transition-colors ${
                        active
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                      } ${isCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <item.icon className={`shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                      {!isCollapsed && <span className="truncate">{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 dark:border-slate-800">
        {!isCollapsed ? (
          <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 truncate">
            HR Management v1.3 (Phase 3)
          </div>
        ) : (
          <div className="py-2 text-center text-[10px] text-slate-500 dark:text-slate-400 font-mono" title="HR Management v1.3">
            v1.3
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
