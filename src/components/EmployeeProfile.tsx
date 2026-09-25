import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Mail,
  Phone,
  Calendar,
  MapPin,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Star,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { getToken, getStoredUser } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

// ---------------------------------------------------------------------------
// Types matching the Prisma schema response
// ---------------------------------------------------------------------------
interface SupervisorNote {
  id: number;
  author: string;
  note: string;
  createdAt: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  dueDate: string;
  urgency: string;
  type: string;
}

interface EmployeeDetail {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  performanceScore: number;
  status: string;
  joinDate: string;
  avatar: string;
  location: string;
  manager: { id: number; name: string } | null;
  subordinates: { id: number; name: string }[];
  supervisorNotes: SupervisorNote[];
  tasks: Task[];
}

// ---------------------------------------------------------------------------
// Helper: derive a simple performance trend from the score
// ---------------------------------------------------------------------------
function deriveTrend(score: number): 'improving' | 'stable' | 'declining' {
  if (score >= 4.5) return 'improving';
  if (score >= 3.5) return 'stable';
  return 'declining';
}

// ---------------------------------------------------------------------------
// Helper: build mock monthly chart data seeded from the real score
// (real historical data would need a PerformanceHistory table)
// ---------------------------------------------------------------------------
function buildChartData(currentScore: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const base = currentScore * 2; // convert 0-5 scale → approx 0-10
  return months.map((month, i) => ({
    month,
    score: parseFloat((base + (Math.sin(i * 0.7) * 0.8)).toFixed(1)),
    target: parseFloat((base * 0.9).toFixed(1)),
  }));
}

// ---------------------------------------------------------------------------
// Status display helpers
// ---------------------------------------------------------------------------
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  UNDER_REVIEW: 'Under Review',
  ON_LEAVE: 'On Leave',
  TERMINATED: 'Terminated',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  UNDER_REVIEW: 'bg-amber-100 text-amber-800',
  ON_LEAVE: 'bg-blue-100 text-blue-800',
  TERMINATED: 'bg-rose-100 text-rose-800',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  HR: 'HR',
  EMPLOYEE: 'Employee',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
interface EmployeeProfileProps {
  employeeId?: number;
}

export function EmployeeProfile({ employeeId }: EmployeeProfileProps) {
  const [employee, setEmployee]           = useState<EmployeeDetail | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [newNote, setNewNote]             = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError]         = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast]                 = useState<string | null>(null);

  // ---- Fetch employee detail ----
  const fetchEmployee = async () => {
    setLoading(true);
    setError(null);
    try {
      const storedUser = getStoredUser();
      let targetId = employeeId ?? storedUser?.employeeId;

      if (!targetId) {
        // If neither prop nor user has an employeeId (e.g. admin), query first available employee
        const listRes = await fetch(`${API_BASE}/api/employees`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (listRes.ok) {
          const list = await listRes.json() as { id: number }[];
          if (list.length > 0) targetId = list[0].id;
        }
      }

      if (!targetId) {
        throw new Error('No employee record available');
      }

      const res = await fetch(`${API_BASE}/api/employees/${targetId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as EmployeeDetail;
      setEmployee(data);
      setSelectedAction(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  // ---- Auto-dismiss toast ----
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- Add supervisor note ----
  const handleAddNote = async () => {
    if (!employee || !newNote.trim()) return;
    setNoteSubmitting(true);
    setNoteError(null);
    try {
      const res = await fetch(`${API_BASE}/api/employees/${employee.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setNewNote('');
      await fetchEmployee(); // refresh notes list
      setToast('Supervisor note added successfully');
    } catch (e) {
      setNoteError(e instanceof Error ? e.message : 'Failed to add note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  // ---- Status / decision action ----
  const ACTION_STATUS: Record<string, string> = {
    keep:   'ACTIVE',
    review: 'UNDER_REVIEW',
    fire:   'TERMINATED',
  };

  const handleAction = async (action: string) => {
    if (!employee) return;
    setSelectedAction(action);
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/employees/${employee.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: ACTION_STATUS[action] }),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const updated = await res.json() as EmployeeDetail;
      setEmployee(prev => prev ? { ...prev, status: updated.status } : prev);
      setToast(`Status updated to ${STATUS_LABEL[updated.status] ?? updated.status} for ${employee.name}`);
    } catch (e) {
      setToast(`Error: ${e instanceof Error ? e.message : 'Failed to update'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ---- Trend icon ----
  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  // ---- Render ----
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading employee profile…
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground">
        <p className="text-destructive">{error ?? 'Employee not found'}</p>
        <Button variant="outline" size="sm" onClick={fetchEmployee}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const trend = deriveTrend(employee.performanceScore);
  const chartData = buildChartData(employee.performanceScore);
  const displayScore = (employee.performanceScore * 2).toFixed(1); // 0-5 → 0-10 display

  return (
    <div className="space-y-6">

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Header with Employee Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={employee.avatar} alt={employee.name} />
                <AvatarFallback className="text-xl">
                  {employee.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-semibold">{employee.name}</h1>
                  <Badge variant="outline">#{employee.id}</Badge>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[employee.status] ?? 'bg-slate-100 text-slate-700'}`}>
                    {STATUS_LABEL[employee.status] ?? employee.status}
                  </span>
                </div>
                <p className="text-lg text-muted-foreground">{ROLE_LABEL[employee.role] ?? employee.role}</p>
                <p className="text-sm text-muted-foreground">{employee.department}</p>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {employee.email}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {employee.location}
                  </div>
                  {employee.manager && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      Reports to: {employee.manager.name}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm text-muted-foreground">Performance:</span>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold">{displayScore}</span>
                  <span className="text-sm text-muted-foreground">/10</span>
                  {getTrendIcon(trend)}
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground justify-end">
                <Calendar className="h-4 w-4" />
                Joined: {new Date(employee.joinDate).toLocaleDateString()}
              </div>
              {employee.subordinates.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {employee.subordinates.length} direct report{employee.subordinates.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance Trend</CardTitle>
          <CardDescription>
            Estimated trajectory based on current score of {displayScore}/10
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="target"
                stroke="#94a3b8"
                strokeDasharray="5 5"
                name="Target"
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Performance Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* AI Summary (generated from live data) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Performance Summary
            </CardTitle>
            <CardDescription>Insights based on current profile data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Overall Assessment</h4>
              <p className="text-sm text-muted-foreground">
                {employee.name} is currently {STATUS_LABEL[employee.status]?.toLowerCase() ?? employee.status} in the{' '}
                {employee.department} department with a performance score of {displayScore}/10.
                {trend === 'improving' && ' Performance trajectory is positive.'}
                {trend === 'stable'   && ' Performance is holding steady.'}
                {trend === 'declining' && ' Performance may need attention.'}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Tasks ({employee.tasks.length})</h4>
              {employee.tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks assigned.</p>
              ) : (
                <ul className="text-sm text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
                  {employee.tasks.map(task => (
                    <li key={task.id} className="flex items-start gap-2">
                      <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>{task.title}</span>
                      <Badge variant="outline" className="ml-auto text-[10px]">{task.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {employee.subordinates.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Direct Reports</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {employee.subordinates.map(s => (
                    <li key={s.id} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {s.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-2">Current Status</h4>
              <Badge
                variant="outline"
                className={
                  employee.status === 'ACTIVE'       ? 'text-green-600 border-green-600' :
                  employee.status === 'UNDER_REVIEW' ? 'text-amber-600 border-amber-600' :
                  employee.status === 'TERMINATED'   ? 'text-rose-600 border-rose-600' :
                  'text-blue-600 border-blue-600'
                }
              >
                {STATUS_LABEL[employee.status] ?? employee.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Supervisor Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Supervisor Notes</CardTitle>
            <CardDescription>
              Observations recorded for {employee.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history">
                  History ({employee.supervisorNotes.length})
                </TabsTrigger>
                <TabsTrigger value="add">Add Note</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-4">
                {employee.supervisorNotes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No notes yet.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
                    {employee.supervisorNotes.map(note => (
                      <div key={note.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium">{note.author}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{note.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="add" className="space-y-4">
                <Textarea
                  placeholder="Add a note about this employee's performance or behaviour…"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="min-h-24"
                  disabled={noteSubmitting}
                />
                {noteError && (
                  <p className="text-xs text-destructive">{noteError}</p>
                )}
                <Button
                  onClick={handleAddNote}
                  className="w-full"
                  disabled={noteSubmitting || !newNote.trim()}
                >
                  {noteSubmitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                  ) : 'Add Note'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>HR Decision</CardTitle>
          <CardDescription>
            Update {employee.name}'s employment status. Changes are saved immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={selectedAction === 'keep' || (!selectedAction && employee.status === 'ACTIVE') ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleAction('keep')}
              disabled={actionLoading}
            >
              {actionLoading && selectedAction === 'keep'
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <CheckCircle className="mr-2 h-4 w-4" />
              }
              Keep
            </Button>
            <Button
              variant={selectedAction === 'review' || (!selectedAction && employee.status === 'UNDER_REVIEW') ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => handleAction('review')}
              disabled={actionLoading}
            >
              {actionLoading && selectedAction === 'review'
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <AlertTriangle className="mr-2 h-4 w-4" />
              }
              Review
            </Button>
            <Button
              variant={selectedAction === 'fire' || (!selectedAction && employee.status === 'TERMINATED') ? 'destructive' : 'outline'}
              className="flex-1"
              onClick={() => handleAction('fire')}
              disabled={actionLoading}
            >
              {actionLoading && selectedAction === 'fire'
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <XCircle className="mr-2 h-4 w-4" />
              }
              Fire
            </Button>
          </div>

          {selectedAction && !actionLoading && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Action Confirmed:</strong> {selectedAction.toUpperCase()} — Status updated to{' '}
                <span className="font-semibold text-foreground">{STATUS_LABEL[ACTION_STATUS[selectedAction]] ?? selectedAction}</span> for {employee.name}.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This HR action has been recorded and saved to the database.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}