import React, { useState } from 'react';
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
import { AlertCircle, CheckCircle2, Loader2, UserPlus } from 'lucide-react';
import { getToken } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export interface ManagerOption {
  id: number;
  name: string;
  department?: string;
}

export interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmployeeAdded: (employee: any) => void;
  managers?: ManagerOption[];
}

export function AddEmployeeModal({
  isOpen,
  onClose,
  onEmployeeAdded,
  managers = [],
}: AddEmployeeModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('Remote');
  const [performanceScore, setPerformanceScore] = useState('5.0');
  const [status, setStatus] = useState('ACTIVE');
  const [joinDate, setJoinDate] = useState(today);
  const [managerId, setManagerId] = useState('none');
  const [avatar, setAvatar] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('EMPLOYEE');
    setDepartment('');
    setLocation('Remote');
    setPerformanceScore('5.0');
    setStatus('ACTIVE');
    setJoinDate(today);
    setManagerId('none');
    setAvatar('');
    setError(null);
    setSuccess(null);
    setIsSubmitting(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
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
        joinDate: joinDate ? new Date(joinDate).toISOString() : new Date().toISOString(),
        location: location.trim() || 'Remote',
        avatar: avatar.trim() || undefined,
        managerId: managerId && managerId !== 'none' ? Number(managerId) : null,
      };

      const res = await fetch(`${API_BASE}/api/employees`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to add employee (HTTP ${res.status})`);
      }

      const createdEmployee = await res.json();
      setSuccess(`Employee "${createdEmployee.name}" successfully added!`);

      setTimeout(() => {
        onEmployeeAdded(createdEmployee);
        resetForm();
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'An error occurred while creating the employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-140 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add New Employee
          </DialogTitle>
          <DialogDescription>
            Enter the employee's personal and organizational details to add them to the directory.
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
              <Label htmlFor="employee-name">Full Name *</Label>
              <Input
                id="employee-name"
                placeholder="e.g. Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-email">Email Address *</Label>
              <Input
                id="employee-email"
                type="email"
                placeholder="e.g. alex.m@company.com"
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
              <Label htmlFor="employee-role">Role *</Label>
              <Select value={role} onValueChange={setRole} disabled={isSubmitting}>
                <SelectTrigger id="employee-role">
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
              <Label htmlFor="employee-department">Department *</Label>
              <Input
                id="employee-department"
                placeholder="e.g. Engineering, Sales, HR"
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
              <Label htmlFor="employee-location">Location</Label>
              <Input
                id="employee-location"
                placeholder="e.g. Remote, New York, London"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-status">Initial Status</Label>
              <Select value={status} onValueChange={setStatus} disabled={isSubmitting}>
                <SelectTrigger id="employee-status">
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

          {/* Join Date & Performance Score */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee-joindate">Join Date</Label>
              <Input
                id="employee-joindate"
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-score">Performance Score (0.0 - 5.0)</Label>
              <Input
                id="employee-score"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={performanceScore}
                onChange={(e) => setPerformanceScore(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Manager & Avatar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employee-manager">Reporting Manager</Label>
              <Select value={managerId} onValueChange={setManagerId} disabled={isSubmitting}>
                <SelectTrigger id="employee-manager">
                  <SelectValue placeholder="Select a manager (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (No Manager)</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name} {m.department ? `(${m.department})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-avatar">Avatar URL</Label>
              <Input
                id="employee-avatar"
                placeholder="https://... (leave blank for auto)"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
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
                  Adding...
                </>
              ) : (
                'Add Employee'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
