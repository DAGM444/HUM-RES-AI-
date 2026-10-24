import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { AlertCircle, CheckCircle2, Loader2, Edit3 } from 'lucide-react';
import { getToken } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export interface ManagerOption {
  id: number;
  name: string;
  department?: string;
}

export interface EditableEmployee {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  performanceScore: number;
  status: string;
  location?: string;
  avatar?: string;
  managerId?: number | null;
  manager?: { id: number; name: string } | null;
}

export interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeUpdated: (employee: EditableEmployee) => void;
  employee: EditableEmployee | null;
  managers?: ManagerOption[];
}

export function EditEmployeeModal({
  isOpen,
  onClose,
  onEmployeeUpdated,
  employee,
  managers = [],
}: EditEmployeeModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('Remote');
  const [performanceScore, setPerformanceScore] = useState('5.0');
  const [status, setStatus] = useState('ACTIVE');
  const [managerId, setManagerId] = useState('none');
  const [avatar, setAvatar] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (employee) {
      setName(employee.name || '');
      setEmail(employee.email || '');
      setRole(employee.role || 'EMPLOYEE');
      setDepartment(employee.department || '');
      setLocation(employee.location || 'Remote');
      setPerformanceScore(String(employee.performanceScore ?? '5.0'));
      setStatus(employee.status || 'ACTIVE');
      setManagerId(employee.managerId ? String(employee.managerId) : employee.manager?.id ? String(employee.manager.id) : 'none');
      setAvatar(employee.avatar || '');
      setError(null);
      setSuccess(null);
    }
  }, [employee]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      setSuccess(null);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Employee name is required');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Email address is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    const trimmedDept = department.trim();
    if (!trimmedDept) {
      setError('Department is required');
      return;
    }

    const parsedScore = parseFloat(performanceScore);
    if (isNaN(parsedScore) || parsedScore < 0 || parsedScore > 5) {
      setError('Performance score must be between 0 and 5');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        role,
        department: trimmedDept,
        status,
        performanceScore: parsedScore,
        location: location.trim() || 'Remote',
        avatar: avatar.trim() || undefined,
        managerId: managerId && managerId !== 'none' ? Number(managerId) : null,
      };

      const res = await fetch(`${API_BASE}/api/employees/${employee.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to update employee (HTTP ${res.status})`);
      }

      const updated = await res.json();
      setSuccess(`Employee "${updated.name}" updated successfully!`);

      setTimeout(() => {
        onEmployeeUpdated(updated);
        onClose();
      }, 50);
    } catch (err: any) {
      setError(err?.message || 'An error occurred while updating the employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter out the current employee from the manager options
  const eligibleManagers = managers.filter((m) => m.id !== employee?.id);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-primary" />
            Edit Employee Details
          </DialogTitle>
          <DialogDescription>
            Update personal or employment information for {employee?.name || 'this employee'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 text-sm rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-employee-name">Full Name *</Label>
              <Input
                id="edit-employee-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-employee-email">Email Address *</Label>
              <Input
                id="edit-employee-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Role & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-employee-role">Role *</Label>
              <Select value={role} onValueChange={setRole} disabled={isSubmitting}>
                <SelectTrigger id="edit-employee-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">EMPLOYEE</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-employee-department">Department *</Label>
              <Input
                id="edit-employee-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {/* Location & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-employee-location">Location</Label>
              <Input
                id="edit-employee-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-employee-status">Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={isSubmitting}>
                <SelectTrigger id="edit-employee-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                  <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                  <SelectItem value="TERMINATED">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Performance Score & Manager */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-employee-score">Performance Score (0.0 - 5.0)</Label>
              <Input
                id="edit-employee-score"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={performanceScore}
                onChange={(e) => setPerformanceScore(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-employee-manager">Reporting Manager</Label>
              <Select value={managerId} onValueChange={setManagerId} disabled={isSubmitting}>
                <SelectTrigger id="edit-employee-manager">
                  <SelectValue placeholder="Select a manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (No Manager)</SelectItem>
                  {eligibleManagers.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} {m.department ? `(${m.department})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Avatar URL */}
          <div className="space-y-2">
            <Label htmlFor="edit-employee-avatar">Avatar URL</Label>
            <Input
              id="edit-employee-avatar"
              placeholder="https://... (leave blank for default)"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
