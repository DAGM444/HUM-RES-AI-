import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  User,
  CheckCheck,
} from 'lucide-react';
import { getToken } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

interface EmployeeSummary {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  avatar?: string;
  status?: string;
}

export interface IncidentRecordItem {
  id: number;
  employeeId: number;
  incidentDate: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  description: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED' | string;
  actionTaken?: string | null;
  reportedBy?: string | null;
  createdAt?: string;
  employee?: EmployeeSummary;
}

const FALLBACK_INCIDENTS: IncidentRecordItem[] = [
  {
    id: 1,
    employeeId: 2,
    incidentDate: '2026-06-15T14:30:00.000Z',
    severity: 'High',
    description: 'Repeated non-compliance with data safety policies and unencrypted client data export.',
    status: 'INVESTIGATING',
    actionTaken: 'Formal security audit opened. Supervised credentials assigned.',
    reportedBy: 'Sarah Jenkins (HR Director)',
    employee: {
      id: 2,
      name: 'Alex Rivera',
      email: 'alex.r@company.com',
      department: 'Engineering',
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    },
  },
  {
    id: 2,
    employeeId: 1,
    incidentDate: '2026-05-20T09:15:00.000Z',
    severity: 'Low',
    description: 'Scheduling conflict disagreement escalated during executive standup meeting.',
    status: 'RESOLVED',
    actionTaken: 'Informal mediation completed; calendar sync protocols clarified.',
    reportedBy: 'Executive Board',
    employee: {
      id: 1,
      name: 'Sarah Jenkins',
      email: 'sarah.j@company.com',
      department: 'Human Resources',
      role: 'HR',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    },
  },
  {
    id: 3,
    employeeId: 2,
    incidentDate: '2026-04-10T11:00:00.000Z',
    severity: 'Medium',
    description: 'Missed mandatory annual compliance training deadline after 3 automated reminders.',
    status: 'RESOLVED',
    actionTaken: 'Training completed under supervisor monitoring; warning logged.',
    reportedBy: 'Compliance Automated Sentinel',
    employee: {
      id: 2,
      name: 'Alex Rivera',
      email: 'alex.r@company.com',
      department: 'Engineering',
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    },
  },
  {
    id: 4,
    employeeId: 2,
    incidentDate: '2026-06-28T16:45:00.000Z',
    severity: 'Critical',
    description: 'Unauthorized privilege escalation probe detected on internal microservices cluster.',
    status: 'OPEN',
    actionTaken: 'SecOps containment in progress; HR disciplinary review pending.',
    reportedBy: 'SecOps Automated Alert',
    employee: {
      id: 2,
      name: 'Alex Rivera',
      email: 'alex.r@company.com',
      department: 'Engineering',
      role: 'EMPLOYEE',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
    },
  },
];

export function Incidents() {
  const [incidents, setIncidents] = useState<IncidentRecordItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields
  const [formEmployeeId, setFormEmployeeId] = useState<string>('');
  const [formIncidentDate, setFormIncidentDate] = useState<string>('');
  const [formSeverity, setFormSeverity] = useState<string>('Medium');
  const [formStatus, setFormStatus] = useState<string>('OPEN');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formActionTaken, setFormActionTaken] = useState<string>('');
  const [formReportedBy, setFormReportedBy] = useState<string>('');

  const fetchIncidentsData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = getToken();
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const [incRes, empRes] = await Promise.all([
        fetch(`${API_BASE}/api/incidents`, { headers: authHeaders }),
        fetch(`${API_BASE}/api/employees`, { headers: authHeaders }),
      ]);

      if (incRes.ok) {
        const data = await incRes.json();
        setIncidents(data);
      } else {
        setIncidents(FALLBACK_INCIDENTS);
      }

      if (empRes.ok) {
        const empData = await empRes.json();
        setEmployees(empData);
        if (empData.length > 0 && !formEmployeeId) {
          setFormEmployeeId(String(empData[0].id));
        }
      }
    } catch (err) {
      console.warn('Using fallback incidents data:', err);
      setIncidents(FALLBACK_INCIDENTS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIncidentsData();
  }, []);

  // Status update
  const handleUpdateStatus = async (id: number, nextStatus: string) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/incidents/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setIncidents((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: updated.status } : item))
        );
      } else {
        // Optimistic update
        setIncidents((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
        );
      }
    } catch (err) {
      console.error('Failed to update incident status:', err);
      setIncidents((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
      );
    }
  };

  // Submit new incident
  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formEmployeeId || !formDescription || !formSeverity) {
      setFormError('Please fill in employee, severity, and description.');
      return;
    }

    setSubmitting(true);
    try {
      const token = getToken();
      const dateVal = formIncidentDate ? new Date(formIncidentDate).toISOString() : new Date().toISOString();

      const res = await fetch(`${API_BASE}/api/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          employeeId: Number(formEmployeeId),
          incidentDate: dateVal,
          severity: formSeverity,
          status: formStatus,
          description: formDescription.trim(),
          actionTaken: formActionTaken.trim() || null,
          reportedBy: formReportedBy.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to record incident');
      }

      const created = await res.json();
      setIncidents((prev) => [created, ...prev]);
      setFormSuccess('Incident logged successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
        setFormDescription('');
        setFormActionTaken('');
        setFormIncidentDate('');
        setFormReportedBy('');
      }, 800);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = incidents.length;
    const open = incidents.filter((i) => i.status === 'OPEN').length;
    const investigating = incidents.filter((i) => i.status === 'INVESTIGATING').length;
    const criticalHigh = incidents.filter((i) => i.severity === 'Critical' || i.severity === 'High').length;
    const resolved = incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length;
    return { total, open, investigating, criticalHigh, resolved };
  }, [incidents]);

  // Filtering
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const empName = inc.employee?.name?.toLowerCase() || '';
      const empDept = inc.employee?.department?.toLowerCase() || '';
      const desc = inc.description?.toLowerCase() || '';
      const rep = inc.reportedBy?.toLowerCase() || '';
      const q = search.toLowerCase();

      const matchesSearch =
        !search || empName.includes(q) || empDept.includes(q) || desc.includes(q) || rep.includes(q);
      const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;
      const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [incidents, search, severityFilter, statusFilter]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return (
          <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/40 font-semibold flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Critical
          </Badge>
        );
      case 'High':
        return (
          <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 font-medium">
            High
          </Badge>
        );
      case 'Medium':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium">
            Medium
          </Badge>
        );
      case 'Low':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30 font-medium">
            Low
          </Badge>
        );
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">
            Open
          </Badge>
        );
      case 'INVESTIGATING':
        return (
          <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30">
            Investigating
          </Badge>
        );
      case 'RESOLVED':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
            Resolved
          </Badge>
        );
      case 'CLOSED':
        return (
          <Badge className="bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30">
            Closed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workplace Incidents & Disciplinary</h1>
          <p className="text-sm text-muted-foreground">
            Log security non-compliance, workplace disputes, safety violations, and formal reviews.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchIncidentsData(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Log New Incident
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Log Workplace Incident or Disciplinary Review</DialogTitle>
                <DialogDescription>
                  Record an official notice, behavioral dispute, policy breach, or security incident.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateIncident} className="space-y-4 py-2">
                {formError && (
                  <div className="p-3 text-sm rounded bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 text-sm rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="employee">Associated Employee *</Label>
                  <Select
                    value={formEmployeeId}
                    onValueChange={(val) => setFormEmployeeId(val)}
                  >
                    <SelectTrigger id="employee">
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          {emp.name} ({emp.department})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity *</Label>
                    <Select value={formSeverity} onValueChange={setFormSeverity}>
                      <SelectTrigger id="severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Initial Status</Label>
                    <Select value={formStatus} onValueChange={setFormStatus}>
                      <SelectTrigger id="status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Incident Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formIncidentDate}
                      onChange={(e) => setFormIncidentDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportedBy">Reported By</Label>
                  <Input
                    id="reportedBy"
                    placeholder="e.g. HR Manager, Security Sentinel, Team Lead..."
                    value={formReportedBy}
                    onChange={(e) => setFormReportedBy(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Incident Description & Findings *</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    placeholder="Describe what occurred, context, and immediate evidence..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actionTaken">Action Taken / Disciplinary Measures</Label>
                  <Textarea
                    id="actionTaken"
                    rows={2}
                    placeholder="e.g. Written warning issued, PIP initiated, access restricted..."
                    value={formActionTaken}
                    onChange={(e) => setFormActionTaken(e.target.value)}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Recording...' : 'Log Incident'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Incidents</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Historical tracked events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical & High</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.criticalHigh}
            </div>
            <p className="text-xs text-muted-foreground">High risk disciplinary cases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Investigations</CardTitle>
            <Clock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {stats.open + stats.investigating}
            </div>
            <p className="text-xs text-muted-foreground">Under active review / hearing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved & Closed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.resolved}
            </div>
            <p className="text-xs text-muted-foreground">Settled with formal documentation</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search incidents, employee, reporter..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Severities</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>

              {(search || severityFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setSeverityFilter('ALL');
                    setStatusFilter('ALL');
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="px-6 py-4">
          <CardTitle className="text-base font-semibold">Incident Records & Case Files</CardTitle>
          <CardDescription>
            Comprehensive ledger of documented workplace safety, policy breaches, and mediation findings.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Description & Details</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading incident cases...
                  </TableCell>
                </TableRow>
              ) : filteredIncidents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No incident records matching the selected criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredIncidents.map((inc) => {
                  const dateFmt = new Date(inc.incidentDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <TableRow key={inc.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={inc.employee?.avatar} />
                            <AvatarFallback>
                              {inc.employee?.name ? inc.employee.name.slice(0, 2).toUpperCase() : 'EM'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">
                              {inc.employee?.name || `Employee #${inc.employeeId}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {inc.employee?.department || 'Department N/A'}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {dateFmt}
                      </TableCell>

                      <TableCell>{getSeverityBadge(inc.severity)}</TableCell>

                      <TableCell className="max-w-[320px]">
                        <div className="font-medium text-sm line-clamp-1">{inc.description}</div>
                        {inc.actionTaken && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">
                            Action: {inc.actionTaken}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {inc.reportedBy || 'HR Staff'}
                      </TableCell>

                      <TableCell>{getStatusBadge(inc.status)}</TableCell>

                      <TableCell className="text-right whitespace-nowrap">
                        {inc.status === 'OPEN' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            onClick={() => handleUpdateStatus(inc.id, 'INVESTIGATING')}
                          >
                            Investigate
                          </Button>
                        ) : inc.status === 'INVESTIGATING' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleUpdateStatus(inc.id, 'RESOLVED')}
                          >
                            <CheckCheck className="h-3.5 w-3.5 mr-1" />
                            Resolve
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Documented</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
