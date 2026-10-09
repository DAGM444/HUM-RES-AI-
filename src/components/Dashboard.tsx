import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { AlertTriangle, Users, TrendingUp, FileText, CheckCircle, Clock, Calendar, AlertCircle, ChevronRight, Settings, MessageCircle, Star } from 'lucide-react';
import { getToken } from '../lib/auth';

interface DashboardProps {
  onNavigateToProfile?: () => void;
  onNavigateToReport?: () => void;
  onNavigateToPendingActions?: () => void;
  onNavigateToChatbot?: () => void;
  onNavigateToCalendar?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToDirectory?: () => void;
}

// Interfaces reflecting our unified backend schema
interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  performanceScore: number;
  status: string;
}

interface Task {
  id: number;
  title: string;
  assignedTo: string | { id?: number; name?: string; department?: string };
  status: string;
  dueDate: string;
  urgency: string;
  type: string;
  daysOverdue?: number;
  score?: number;
  department?: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string;
  attendee?: string;
  daysUntil?: number;
}

export function Dashboard({ 
  onNavigateToProfile, 
  onNavigateToReport, 
  onNavigateToPendingActions, 
  onNavigateToChatbot, 
  onNavigateToCalendar, 
  onNavigateToSettings, 
  onNavigateToDirectory 
}: DashboardProps) {

  // Component States mapped to dynamic database responses
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchDashboardMetrics() {
      try {
        const token = getToken();
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        const [empRes, taskRes, eventRes] = await Promise.all([
          fetch('http://localhost:5000/api/employees', { headers: authHeaders }),
          fetch('http://localhost:5000/api/tasks', { headers: authHeaders }),
          fetch('http://localhost:5000/api/events', { headers: authHeaders })
        ]);

        const empData = await empRes.json();
        const taskData = await taskRes.json();
        const eventData = await eventRes.json();

        setEmployees(empData);
        setTasks(taskData);
        setEvents(eventData);
      } catch (err) {
        console.error('Error hydrating dashboard datasets:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardMetrics();
  }, []);

  // Compute live calculations from state values
  const totalEmployees = employees.length;
  const onLeaveCount = employees.filter(e => e.status === 'On Leave').length;
  const performanceIssuesCount = employees.filter(e => e.performanceScore < 6.0).length;
  const topPerformersCount = employees.filter(e => e.performanceScore >= 8.5).length;

  const averagePerformance = totalEmployees > 0 
    ? parseFloat((employees.reduce((acc, e) => acc + e.performanceScore, 0) / totalEmployees).toFixed(1))
    : 0;

  // Generate a live Department breakdown object dynamically
  const departmentBreakdown = employees.reduce((acc: Record<string, number>, emp) => {
    const dept = emp.department.toLowerCase();
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'review': return <Clock className="h-4 w-4" />;
      case 'performance': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground animate-pulse">
        Hydrating operational framework indexes...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your team's performance and pending actions bound to SQLite service
        </p>
      </div>

      {/* Key Metrics - Enhanced Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{totalEmployees}</div>
              <div className="text-xs text-muted-foreground">
                {onLeaveCount} currently on leave
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{averagePerformance}/10</div>
              <Progress value={averagePerformance * 10} className="h-2" />
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Action Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{tasks.length}</div>
              <div className="text-xs text-destructive font-medium">
                {tasks.filter(t => t.urgency === 'high').length} high priority task streams
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600" />
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Reviews</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{events.length}</div>
              <div className="text-xs text-muted-foreground">
                Next event: {events[0]?.title || 'None Scheduled'}
              </div>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600" />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performance Issues / Dynamic Tasks Area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Performance Issues & Action Required
                </CardTitle>
                <CardDescription>
                  Active system workflows requiring manager attention
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={onNavigateToPendingActions}>
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.slice(0, 4).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">{getActionIcon(task.type)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">
                        {typeof task.assignedTo === 'object' && task.assignedTo !== null
                          ? (task.assignedTo as any).name || 'Assigned'
                          : task.assignedTo}
                      </p>
                      {(task.department || (typeof task.assignedTo === 'object' && (task.assignedTo as any)?.department)) && (
                        <Badge variant="outline" className="text-xs">
                          {task.department || (task.assignedTo as any)?.department}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{task.title}</p>
                    {task.daysOverdue && (
                      <p className="text-xs text-destructive">{task.daysOverdue} days overdue</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getUrgencyColor(task.urgency) as any} className="text-xs">
                    {task.urgency}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={onNavigateToProfile}>
                    Review
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Events Module */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Reviews
            </CardTitle>
            <CardDescription>Scheduled performance evaluations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.slice(0, 4).map((event) => (
              <div key={event.id} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate">{event.attendee || 'All Hands'}</p>
                  <Badge variant="outline" className="text-xs">{event.type}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{event.title}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <p>{event.date} @ {event.time}</p>
                    {event.daysUntil !== undefined && (
                      <p className={event.daysUntil <= 3 ? "text-destructive font-semibold" : ""}>
                        {event.daysUntil} days
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Operations Strip */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions & Critical Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Button className="justify-start h-auto p-4" variant="ghost" onClick={onNavigateToReport}>
              <FileText className="h-5 w-5 mr-3 text-blue-600" />
              <div className="text-left">
                <div className="font-medium">Performance Reports</div>
                <div className="text-xs text-muted-foreground">Generate metrics pipelines</div>
              </div>
            </Button>
            <Button className="justify-start h-auto p-4" variant="ghost" onClick={onNavigateToPendingActions}>
              <CheckCircle className="h-5 w-5 mr-3 text-green-600" />
              <div className="text-left">
                <div className="font-medium">Pending Approvals</div>
                <div className="text-xs text-muted-foreground">{tasks.length} workflows awaiting verification</div>
              </div>
            </Button>
            <Button className="justify-start h-auto p-4" variant="ghost" onClick={onNavigateToDirectory}>
              <Users className="h-5 w-5 mr-3 text-purple-600" />
              <div className="text-left">
                <div className="font-medium">Employee Directory</div>
                <div className="text-xs text-muted-foreground">{totalEmployees} node entries profile directory</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Breakdown Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Department Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(departmentBreakdown).map(([dept, count]) => (
                <div key={dept} className="flex items-center justify-between border-b pb-2 last:border-none">
                  <span className="capitalize font-medium">{dept}</span>
                  <Badge variant="secondary">{count} structural entities</Badge>
                </div>
              ))}
              <div className="pt-4 border-t flex justify-between text-sm">
                <span className="text-green-600 font-medium">Top Performers: {topPerformersCount}</span>
                <span className="text-destructive font-medium">Under Review: {performanceIssuesCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}