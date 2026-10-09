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
} from './ui/sidebar';

// Primary application navigation items
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
    title: 'Employee Directory',
    icon: Users,
    path: '/employees',
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

// HR function-specific navigation items
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

interface AppSidebarProps {
  onNavigate?: (path: string) => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

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
    <Sidebar>
      <SidebarHeader>
        <div
          className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => handleItemClick('/dashboard')}
        >
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-semibold tracking-tight">HR Management</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item, index) => {
                const active = isItemActive(item.path);
                return (
                  <SidebarMenuItem key={`app-${item.title}-${index}`}>
                    <SidebarMenuButton
                      onClick={() => handleItemClick(item.path)}
                      className={`cursor-pointer transition-colors ${
                        active ? 'bg-accent text-accent-foreground font-semibold' : ''
                      }`}
                    >
                      <item.icon className={active ? 'text-primary' : undefined} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>HR Functions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {hrItems.map((item, index) => {
                const active = isItemActive(item.path);
                return (
                  <SidebarMenuItem key={`hr-${item.title}-${index}`}>
                    <SidebarMenuButton
                      onClick={() => handleItemClick(item.path)}
                      className={`cursor-pointer transition-colors ${
                        active ? 'bg-accent text-accent-foreground font-semibold' : ''
                      }`}
                    >
                      <item.icon className={active ? 'text-primary' : undefined} />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          HR Management v1.3 (Phase 3)
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}