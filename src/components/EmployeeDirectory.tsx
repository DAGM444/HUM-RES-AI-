import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Eye,
  FileText,
  Download,
  UserPlus,
  CheckCircle2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  Edit3,
  Trash2,
  UserX,
} from 'lucide-react';
import { EditEmployeeModal } from './EditEmployeeModal';
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog';
import { getToken } from '../lib/auth';
import { AddEmployeeModal } from './AddEmployeeModal';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

interface LiveEmployee {
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
}

// Map DB enum status → display label
const STATUS_LABEL: Record<string, string> = {
  ACTIVE:       'Active',
  UNDER_REVIEW: 'Under Review',
  ON_LEAVE:     'On Leave',
  TERMINATED:   'Terminated',
};

interface EmployeeDirectoryProps {
  onNavigateToProfile?: (employeeId: number) => void;
  onNavigateToReport?: (employeeId: number) => void;
}

type SortField = 'name' | 'role' | 'department' | 'performanceScore' | 'status' | 'joinDate';
type SortDirection = 'asc' | 'desc' | null;

export function EmployeeDirectory({ onNavigateToProfile, onNavigateToReport }: EmployeeDirectoryProps) {
  const [employees, setEmployees]               = useState<LiveEmployee[]>([]);
  const [loadingData, setLoadingData]           = useState(true);
  const [fetchError, setFetchError]             = useState<string | null>(null);
  const [searchTerm, setSearchTerm]             = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter]         = useState('all');
  const [sortField, setSortField]               = useState<SortField | null>(null);
  const [sortDirection, setSortDirection]       = useState<SortDirection>(null);
  const [currentPage, setCurrentPage]           = useState(1);
  const [itemsPerPage, setItemsPerPage]         = useState(10);
  const [isAddModalOpen, setIsAddModalOpen]     = useState(false);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  const [activeDropdownId, setActiveDropdownId] = useState<number | null>(null);
  const [editingEmployee, setEditingEmployee]   = useState<LiveEmployee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen]   = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<LiveEmployee | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.employee-actions-menu')) {
        setActiveDropdownId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveDropdownId(null);
    };

    if (activeDropdownId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeDropdownId]);

  const handleEmployeeAdded = (newEmployee: LiveEmployee) => {
    fetchEmployees();
    setSuccessNotification(`Employee "${newEmployee.name}" was added successfully!`);
    setTimeout(() => {
      setSuccessNotification(null);
    }, 4000);
  };

  const handleEmployeeUpdated = (updated: any) => {
    fetchEmployees();
    setSuccessNotification(`Employee "${updated.name}" was updated successfully!`);
    setTimeout(() => {
      setSuccessNotification(null);
    }, 4000);
  };

  const handleEmployeeDeletedOrDeactivated = (action: 'deactivated' | 'deleted', emp: any) => {
    fetchEmployees();
    setSuccessNotification(
      action === 'deactivated'
        ? `Employee "${emp.name}" was deactivated.`
        : `Employee "${emp.name}" was permanently deleted.`
    );
    setTimeout(() => {
      setSuccessNotification(null);
    }, 4000);
  };

  const handleExportCSV = () => {
    if (filteredEmployees.length === 0) {
      setSuccessNotification('No employees available to export.');
      setTimeout(() => setSuccessNotification(null), 4000);
      return;
    }

    const headers = ['Name', 'Email', 'Role', 'Department', 'Status', 'Performance Score', 'Join Date'];

    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) return '""';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const rows = filteredEmployees.map((emp) => [
      escapeCSV(emp.name),
      escapeCSV(emp.email),
      escapeCSV(emp.role),
      escapeCSV(emp.department),
      escapeCSV(STATUS_LABEL[emp.status] ?? emp.status),
      escapeCSV(emp.performanceScore),
      escapeCSV(emp.joinDate ? new Date(emp.joinDate).toISOString().split('T')[0] : ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employee-directory-report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccessNotification(`Exported ${filteredEmployees.length} employee${filteredEmployees.length === 1 ? '' : 's'} to CSV!`);
    setTimeout(() => setSuccessNotification(null), 4000);
  };

  // ---- Fetch live data ----
  const fetchEmployees = async () => {
    setLoadingData(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_BASE}/api/employees`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as LiveEmployee[];
      setEmployees(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load employees');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  // Derive unique filter options from live data
  const departments = [...new Set(employees.map(emp => emp.department))];
  const statuses    = [...new Set(employees.map(emp => STATUS_LABEL[emp.status] ?? emp.status))];

  // Reset page when filter criteria change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, departmentFilter, statusFilter]);

  // ---- Filter + Sort ----
  const filteredEmployees = employees
    .filter(employee => {
      const displayStatus = STATUS_LABEL[employee.status] ?? employee.status;
      const matchesSearch =
        employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.role.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = departmentFilter === 'all' || employee.department === departmentFilter;
      const matchesStatus     = statusFilter === 'all' || displayStatus === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    })
    .sort((a, b) => {
      if (!sortField || !sortDirection) return 0;
      let aVal: string | number = a[sortField] as string | number;
      let bVal: string | number = b[sortField] as string | number;
      if (sortField === 'performanceScore') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      }
      if (sortField === 'joinDate') {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  // ---- Stats ----
  const activeCount    = filteredEmployees.filter(e => e.status === 'ACTIVE').length;
  const reviewCount    = filteredEmployees.filter(e => e.status === 'UNDER_REVIEW').length;
  const avgPerformance = filteredEmployees.length > 0
    ? (filteredEmployees.reduce((sum, e) => sum + e.performanceScore, 0) / filteredEmployees.length).toFixed(2)
    : '0.0';

  // ---- Pagination ----
  const totalPages         = Math.ceil(filteredEmployees.length / itemsPerPage) || 1;
  const startIndex         = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') { setSortField(null); setSortDirection(null); }
      else setSortDirection('asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    if (sortDirection === 'asc')  return <ArrowUp   className="h-4 w-4 text-primary" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-4 w-4 text-primary" />;
    return <ArrowUpDown className="h-4 w-4 opacity-50" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':       return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      case 'UNDER_REVIEW': return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
      case 'ON_LEAVE':     return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300';
      case 'TERMINATED':   return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300';
      default:             return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getPerformanceColor = (score: number) => {
    const display = score * 2; // 0-5 → 0-10
    if (display >= 9) return 'text-emerald-600 font-medium';
    if (display >= 7) return 'text-amber-600 font-medium';
    if (display >= 5) return 'text-orange-600';
    return 'text-rose-600 font-semibold';
  };

  // ---- Loading / error states ----
  if (loadingData) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading employee directory…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground">
        <p className="text-destructive">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={fetchEmployees}>
          <RefreshCw className="h-4 w-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      {/* Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Directory</h1>
          <p className="text-muted-foreground mt-1">
            Manage and view all employees in your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="h-9" onClick={() => setIsAddModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {successNotification && (
        <div className="p-3 text-sm rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successNotification}</span>
        </div>
      )}

      {/* Filters */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2 font-semibold">
            <Filter className="h-5 w-5 text-muted-foreground" />
            Search &amp; Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-10 w-full"
              />
            </div>
            <div className="grid grid-cols-2 md:flex gap-3">
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="h-10 px-3 border rounded-md bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-10 px-3 border rounded-md bg-background text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="all">All Statuses</option>
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={itemsPerPage}
                onChange={e => setItemsPerPage(parseInt(e.target.value))}
                className="h-10 px-3 border rounded-md bg-background text-sm font-medium col-span-2 md:w-32 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 font-semibold">
                <Users className="h-5 w-5 text-muted-foreground" />
                Employees
              </CardTitle>
              <CardDescription className="mt-0.5">
                Showing {filteredEmployees.length === 0 ? 0 : startIndex + 1}–
                {Math.min(startIndex + itemsPerPage, filteredEmployees.length)} of{' '}
                {filteredEmployees.length} profiles
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="p-4 font-semibold">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-foreground transition-colors">
                      Employee {getSortIcon('name')}
                    </button>
                  </TableHead>
                  <TableHead className="p-4 font-semibold">
                    <button onClick={() => handleSort('role')} className="flex items-center gap-2 hover:text-foreground transition-colors">
                      Role {getSortIcon('role')}
                    </button>
                  </TableHead>
                  <TableHead className="p-4 font-semibold">
                    <button onClick={() => handleSort('department')} className="flex items-center gap-2 hover:text-foreground transition-colors">
                      Department {getSortIcon('department')}
                    </button>
                  </TableHead>
                  <TableHead className="p-4 font-semibold">
                    <button onClick={() => handleSort('performanceScore')} className="flex items-center gap-2 hover:text-foreground transition-colors">
                      Performance {getSortIcon('performanceScore')}
                    </button>
                  </TableHead>
                  <TableHead className="p-4 font-semibold">
                    <button onClick={() => handleSort('status')} className="flex items-center gap-2 hover:text-foreground transition-colors">
                      Status {getSortIcon('status')}
                    </button>
                  </TableHead>
                  <TableHead className="p-4 font-semibold">
                    <button onClick={() => handleSort('joinDate')} className="flex items-center gap-2 hover:text-foreground transition-colors">
                      Join Date {getSortIcon('joinDate')}
                    </button>
                  </TableHead>
                  <TableHead className="p-4 text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      No matching records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEmployees.map(employee => (
                    <TableRow
                      key={employee.id}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => onNavigateToProfile?.(employee.id)}
                    >
                      <TableCell className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={employee.avatar}
                            alt={employee.name}
                            className="h-10 w-10 rounded-full object-cover border border-muted"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          <div>
                            <div className="font-medium text-sm text-foreground">{employee.name}</div>
                            <div className="text-xs text-muted-foreground">{employee.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="p-4">
                        <div className="text-sm text-foreground">{employee.role}</div>
                        <div className="text-xs text-muted-foreground">{employee.location}</div>
                      </TableCell>
                      <TableCell className="p-4">
                        <Badge variant="outline" className="text-xs font-normal px-2.5 py-0.5 rounded-md">
                          {employee.department}
                        </Badge>
                      </TableCell>
                      <TableCell className="p-4">
                        <span className={`text-sm ${getPerformanceColor(employee.performanceScore)}`}>
                          {(employee.performanceScore * 2).toFixed(1)} / 10
                        </span>
                      </TableCell>
                      <TableCell className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium tracking-wide ${getStatusColor(employee.status)}`}>
                          {STATUS_LABEL[employee.status] ?? employee.status}
                        </span>
                      </TableCell>
                      <TableCell className="p-4 text-sm text-muted-foreground">
                        {new Date(employee.joinDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell className="p-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigateToProfile?.(employee.id)}
                            className="h-8 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Profile
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigateToReport?.(employee.id)}
                            className="h-8 text-xs"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Report
                          </Button>
                          <div className="relative employee-actions-menu">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              aria-label={`Actions for ${employee.name}`}
                              onClick={() =>
                                setActiveDropdownId(prev => (prev === employee.id ? null : employee.id))
                              }
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>

                            {activeDropdownId === employee.id && (
                              <div
                                role="menu"
                                aria-label="Employee Actions"
                                className="absolute right-0 top-full mt-1 w-44 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg z-50 animate-in fade-in-0 zoom-in-95"
                              >
                                <button
                                  role="menuitem"
                                  type="button"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground text-left cursor-pointer transition-colors"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    onNavigateToProfile?.(employee.id);
                                  }}
                                >
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>View Profile</span>
                                </button>

                                <button
                                  role="menuitem"
                                  type="button"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-sm hover:bg-accent hover:text-accent-foreground text-left cursor-pointer transition-colors"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setEditingEmployee(employee);
                                    setIsEditModalOpen(true);
                                  }}
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>Edit Employee</span>
                                </button>

                                <div className="h-px bg-muted my-1" />

                                <button
                                  role="menuitem"
                                  type="button"
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-sm text-destructive hover:bg-destructive/10 text-left cursor-pointer transition-colors"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setDeletingEmployee(employee);
                                    setIsDeleteModalOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  <span>Delete / Deactivate</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 gap-4 border-t bg-muted/10">
              <div className="text-sm text-muted-foreground order-2 sm:order-1">
                Page <span className="font-medium text-foreground">{currentPage}</span> of{' '}
                <span className="font-medium text-foreground">{totalPages}</span>
              </div>
              <div className="flex items-center gap-1.5 order-1 sm:order-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  if (pageNum === 1 || pageNum === totalPages || Math.abs(currentPage - pageNum) <= 1) {
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="h-8 w-8 text-xs p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="text-muted-foreground px-1 text-xs">…</span>;
                  }
                  return null;
                })}
                <Button
                  variant="outline" size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5 text-xs gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Records Viewable</p>
                <p className="text-3xl font-bold tracking-tight">{filteredEmployees.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Active Members</p>
                <p className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{activeCount}</p>
              </div>
              <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Under Review</p>
                <p className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{reviewCount}</p>
              </div>
              <div className="h-12 w-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Avg Performance</p>
                <p className="text-3xl font-bold tracking-tight">{avgPerformance}</p>
              </div>
              <div className="h-12 w-12 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
                <div className="h-3 w-3 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onEmployeeAdded={handleEmployeeAdded}
        managers={employees}
      />

      <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEmployee(null);
        }}
        onEmployeeUpdated={handleEmployeeUpdated}
        employee={editingEmployee}
        managers={employees}
      />

      <DeleteEmployeeDialog
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingEmployee(null);
        }}
        employee={deletingEmployee}
        onEmployeeDeletedOrDeactivated={handleEmployeeDeletedOrDeactivated}
      />
    </div>
  );
}