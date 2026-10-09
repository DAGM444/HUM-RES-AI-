import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from './ui/select';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from './ui/dialog';
import { 
  Check, 
  X, 
  Filter, 
  Search, 
  FileText, 
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Textarea } from './ui/textarea';
import { getToken, authHeader } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

interface TaskEmployee {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
  status: string;
}

interface TaskItem {
  id: number;
  title: string;
  status: string; // 'PENDING' | 'APPROVED' | 'REJECTED'
  actionType: string; // 'fire' | 'review'
  reason: string | null;
  priority: string | null; // 'high' | 'medium' | 'low'
  dueDate: string;
  urgency: string;
  type: string;
  score: number | null;
  department: string | null;
  initiatedBy: string | null;
  initiatorRole: string | null;
  decidedBy: string | null;
  decidedDate: string | null;
  decisionNotes: string | null;
  supportingDocs: string | null;
  createdAt: string;
  employeeId: number;
  assignedTo: TaskEmployee;
}

interface PendingActionsProps {
  onNavigateToEmailTemplates?: () => void;
}

export function PendingActions({ onNavigateToEmailTemplates }: PendingActionsProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [initiatorFilter, setInitiatorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [decisionDialog, setDecisionDialog] = useState<{
    open: boolean;
    action: TaskItem | null;
    decision: 'approve' | 'reject' | null;
  }>({
    open: false,
    action: null,
    decision: null
  });
  const [decisionNotes, setDecisionNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // ---- Fetch Tasks ----
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/tasks`, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json() as TaskItem[];
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // ---- Auto dismiss toast ----
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // ---- Data partitions ----
  const pendingActions = useMemo(() => {
    return tasks.filter(t => t.status.toUpperCase() === 'PENDING');
  }, [tasks]);

  const decisionHistory = useMemo(() => {
    return tasks.filter(t => 
      t.status.toUpperCase() === 'APPROVED' || t.status.toUpperCase() === 'REJECTED'
    );
  }, [tasks]);

  // ---- Filter and search functionality ----
  const filteredActions = useMemo(() => {
    return pendingActions.filter(action => {
      const empName = action.assignedTo?.name || '';
      const reasonText = action.reason || action.title || '';
      const initiator = action.initiatedBy || '';

      const matchesSearch = 
        empName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reasonText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        initiator.toLowerCase().includes(searchQuery.toLowerCase());

      const normActionType = (action.actionType || 'review').toLowerCase();
      const matchesActionType = actionFilter === 'all' || normActionType === actionFilter;

      const normPriority = (action.priority || action.urgency || 'medium').toLowerCase();
      const matchesPriority = priorityFilter === 'all' || normPriority === priorityFilter;

      const matchesInitiator = initiatorFilter === 'all' || initiator === initiatorFilter;

      return matchesSearch && matchesActionType && matchesPriority && matchesInitiator;
    });
  }, [pendingActions, searchQuery, actionFilter, priorityFilter, initiatorFilter]);

  const uniqueInitiators = useMemo(() => {
    const set = new Set<string>();
    pendingActions.forEach(a => {
      if (a.initiatedBy) set.add(a.initiatedBy);
    });
    return Array.from(set);
  }, [pendingActions]);

  const getActionBadge = (actionType: string) => {
    const isFire = actionType.toLowerCase() === 'fire';
    return (
      <Badge variant={isFire ? 'destructive' : 'default'}>
        {isFire ? 'Termination' : 'Review'}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase();
    const variant = p === 'high' ? 'destructive' : p === 'medium' ? 'default' : 'secondary';
    return <Badge variant={variant as any}>{priority.toUpperCase()}</Badge>;
  };

  const getDecisionBadge = (decision: string) => {
    const isApproved = decision.toUpperCase() === 'APPROVED';
    return (
      <Badge 
        variant={isApproved ? 'default' : 'secondary'} 
        className={`flex items-center w-fit ${isApproved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-500 text-white'}`}
      >
        {isApproved ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
        {isApproved ? 'Approved' : 'Rejected'}
      </Badge>
    );
  };

  const handleDecision = (action: TaskItem, decision: 'approve' | 'reject') => {
    setDecisionDialog({ open: true, action, decision });
    setDecisionNotes('');
  };

  const confirmDecision = async () => {
    if (!decisionDialog.action || !decisionDialog.decision) return;
    setIsSubmitting(true);
    const actionId = decisionDialog.action.id;
    const endpoint = decisionDialog.decision === 'approve' 
      ? `${API_BASE}/api/tasks/${actionId}/approve` 
      : `${API_BASE}/api/tasks/${actionId}/reject`;

    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader()
        },
        body: JSON.stringify({ notes: decisionNotes })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? 'Failed to update action request');
      }

      const isApprove = decisionDialog.decision === 'approve';
      setToast(
        isApprove
          ? `Action approved for ${decisionDialog.action.assignedTo?.name || 'employee'}!`
          : `Action rejected for ${decisionDialog.action.assignedTo?.name || 'employee'}.`
      );

      setDecisionDialog({ open: false, action: null, decision: null });
      setDecisionNotes('');
      await fetchTasks();

      // If approved, offer navigation to Email Templates
      if (isApprove && onNavigateToEmailTemplates) {
        setTimeout(() => {
          const shouldNavigate = window.confirm(
            'Action approved successfully! Would you like to navigate to Email Templates to send notification emails?'
          );
          if (shouldNavigate) {
            onNavigateToEmailTemplates();
          }
        }, 300);
      }
    } catch (e) {
      setToast(`Error: ${e instanceof Error ? e.message : 'Action failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseSupportingDocs = (docs: string | null): string[] => {
    if (!docs) return ['Performance Review.pdf'];
    return docs.split(',').map(d => d.trim()).filter(Boolean);
  };

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading pending actions…
      </div>
    );
  }

  // ---- Error state ----
  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchTasks}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  const highPriorityCount = pendingActions.filter(a => 
    (a.priority || a.urgency || '').toLowerCase() === 'high'
  ).length;

  const terminationCount = pendingActions.filter(a => 
    (a.actionType || '').toLowerCase() === 'fire' || a.title.toLowerCase().includes('terminat')
  ).length;

  const reviewCount = pendingActions.filter(a => 
    (a.actionType || '').toLowerCase() === 'review' || a.title.toLowerCase().includes('review')
  ).length;

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Actions</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve employee action requests requiring management approval
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTasks} className="h-9 w-fit">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight">{pendingActions.length}</p>
                <p className="text-sm font-medium text-muted-foreground">Total Pending</p>
              </div>
              <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight text-red-600">{highPriorityCount}</p>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
              </div>
              <div className="h-10 w-10 bg-red-50 dark:bg-red-950/40 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight text-rose-600">{terminationCount}</p>
                <p className="text-sm font-medium text-muted-foreground">Termination Requests</p>
              </div>
              <div className="h-10 w-10 bg-rose-50 dark:bg-rose-950/40 rounded-lg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight text-blue-600">{reviewCount}</p>
                <p className="text-sm font-medium text-muted-foreground">Review Requests</p>
              </div>
              <div className="h-10 w-10 bg-blue-50 dark:bg-blue-950/40 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="pending">Pending Actions ({pendingActions.length})</TabsTrigger>
          <TabsTrigger value="history">Decision History ({decisionHistory.length})</TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value="pending" className="space-y-4">
          {/* Filters */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees, reasons, or initiators..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
                
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[150px] h-9">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="fire">Termination</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={initiatorFilter} onValueChange={setInitiatorFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Initiator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Initiators</SelectItem>
                    {uniqueInitiators.map(initiator => (
                      <SelectItem key={initiator} value={initiator}>{initiator}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Pending Actions Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg">Pending Requests ({filteredActions.length})</CardTitle>
              <CardDescription>
                Actions requiring approval from management
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="p-4">Employee</TableHead>
                    <TableHead className="p-4">Action</TableHead>
                    <TableHead className="p-4">Reason / Item</TableHead>
                    <TableHead className="p-4">Initiated By</TableHead>
                    <TableHead className="p-4">Priority</TableHead>
                    <TableHead className="p-4">Date</TableHead>
                    <TableHead className="p-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        No pending actions matching criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredActions.map((action) => {
                      const emp = action.assignedTo;
                      const priority = action.priority || action.urgency || 'medium';
                      const actionType = action.actionType || 'review';
                      const docs = parseSupportingDocs(action.supportingDocs);

                      return (
                        <TableRow key={action.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={emp?.avatar} alt={emp?.name || 'Employee'} />
                                <AvatarFallback>
                                  {(emp?.name || 'EM').split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm text-foreground">{emp?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">#{action.employeeId} · {emp?.department || 'Staff'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="p-4">
                            {getActionBadge(actionType)}
                          </TableCell>
                          <TableCell className="p-4 max-w-[240px]">
                            <p className="truncate text-sm font-medium text-foreground">{action.title}</p>
                            {action.reason && (
                              <p className="truncate text-xs text-muted-foreground mt-0.5">{action.reason}</p>
                            )}
                          </TableCell>
                          <TableCell className="p-4">
                            <div>
                              <p className="text-sm font-medium">{action.initiatedBy || 'HR'}</p>
                              <p className="text-xs text-muted-foreground">{action.initiatorRole || 'Management'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="p-4">
                            {getPriorityBadge(priority)}
                          </TableCell>
                          <TableCell className="p-4">
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>Due: <span className="text-foreground">{new Date(action.dueDate).toLocaleDateString()}</span></p>
                              <p>Added: {new Date(action.createdAt).toLocaleDateString()}</p>
                            </div>
                          </TableCell>
                          <TableCell className="p-4">
                            <div className="flex items-center gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => handleDecision(action, 'approve')}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 text-xs"
                                onClick={() => handleDecision(action, 'reject')}
                              >
                                <X className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Action Request Details</DialogTitle>
                                    <DialogDescription>
                                      Complete request details for {emp?.name || 'Employee'}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 pt-2">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Employee</h4>
                                        <p className="text-sm font-medium mt-1">
                                          {emp?.name} (#{action.employeeId})
                                        </p>
                                        <p className="text-xs text-muted-foreground">{emp?.role} · {emp?.department}</p>
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Action Type</h4>
                                        <div className="mt-1">{getActionBadge(actionType)}</div>
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Initiated By</h4>
                                        <p className="text-sm font-medium mt-1">
                                          {action.initiatedBy || 'HR'} ({action.initiatorRole || 'Management'})
                                        </p>
                                      </div>
                                      <div>
                                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">Priority</h4>
                                        <div className="mt-1">{getPriorityBadge(priority)}</div>
                                      </div>
                                    </div>
                                    <div className="border-t pt-3">
                                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Title &amp; Reason</h4>
                                      <p className="text-sm font-medium mt-1">{action.title}</p>
                                      {action.reason && (
                                        <p className="text-sm text-muted-foreground mt-1">{action.reason}</p>
                                      )}
                                    </div>
                                    <div className="border-t pt-3">
                                      <h4 className="text-xs font-semibold uppercase text-muted-foreground">Supporting Documents</h4>
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {docs.map((doc, idx) => (
                                          <Badge key={idx} variant="outline" className="flex items-center gap-1 text-xs">
                                            <FileText className="h-3 w-3" />
                                            {doc}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DECISION HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="text-lg">Decision History ({decisionHistory.length})</CardTitle>
              <CardDescription>
                Previous action decisions and their recorded outcomes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="p-4">Employee</TableHead>
                    <TableHead className="p-4">Action Type</TableHead>
                    <TableHead className="p-4">Decision</TableHead>
                    <TableHead className="p-4">Decided By</TableHead>
                    <TableHead className="p-4">Date</TableHead>
                    <TableHead className="p-4">Request / Reason</TableHead>
                    <TableHead className="p-4">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decisionHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        No historical decisions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    decisionHistory.map((decision) => (
                      <TableRow key={decision.id} className="hover:bg-muted/40 transition-colors">
                        <TableCell className="p-4 font-medium">
                          {decision.assignedTo?.name || `Employee #${decision.employeeId}`}
                        </TableCell>
                        <TableCell className="p-4">
                          {getActionBadge(decision.actionType || 'review')}
                        </TableCell>
                        <TableCell className="p-4">
                          {getDecisionBadge(decision.status)}
                        </TableCell>
                        <TableCell className="p-4 text-sm font-medium">
                          {decision.decidedBy || 'HR Management'}
                        </TableCell>
                        <TableCell className="p-4 text-sm text-muted-foreground">
                          {decision.decidedDate 
                            ? new Date(decision.decidedDate).toLocaleDateString() 
                            : new Date(decision.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="p-4 max-w-[200px]">
                          <p className="truncate text-sm font-medium">{decision.title}</p>
                          {decision.reason && (
                            <p className="truncate text-xs text-muted-foreground mt-0.5">{decision.reason}</p>
                          )}
                        </TableCell>
                        <TableCell className="p-4 max-w-[240px]">
                          <p className="truncate text-sm text-muted-foreground">
                            {decision.decisionNotes || 'No notes provided'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Decision Confirmation Dialog */}
      <Dialog 
        open={decisionDialog.open} 
        onOpenChange={(open) => {
          if (!isSubmitting) setDecisionDialog(prev => ({ ...prev, open }));
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionDialog.decision === 'approve' ? 'Approve' : 'Reject'} Action Request
            </DialogTitle>
            <DialogDescription>
              You are about to {decisionDialog.decision} the action request for{' '}
              <strong className="text-foreground">{decisionDialog.action?.assignedTo?.name || 'this employee'}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            <div className="p-3.5 border rounded-lg bg-muted/40 space-y-1">
              <p className="text-sm font-medium">Request Details:</p>
              <p className="text-sm text-foreground">
                {decisionDialog.action?.title}
              </p>
              {decisionDialog.action?.reason && (
                <p className="text-xs text-muted-foreground">
                  Reason: {decisionDialog.action.reason}
                </p>
              )}
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Decision Notes (Optional)</label>
              <Textarea
                placeholder="Add any notes or justification for this decision..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setDecisionDialog({ open: false, action: null, decision: null })}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={decisionDialog.decision === 'approve' ? 'default' : 'destructive'}
              className={decisionDialog.decision === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={confirmDecision}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : decisionDialog.decision === 'approve' ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Approve Request
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-1.5" />
                  Reject Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}