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
import { AlertCircle, AlertTriangle, Loader2, UserX, Trash2 } from 'lucide-react';
import { getToken } from '../lib/auth';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000';

export interface DeleteEmployeeTarget {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
}

export interface DeleteEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employee: DeleteEmployeeTarget | null;
  onEmployeeDeletedOrDeactivated: (action: 'deactivated' | 'deleted', employee: DeleteEmployeeTarget) => void;
}

export function DeleteEmployeeDialog({
  isOpen,
  onClose,
  employee,
  onEmployeeDeletedOrDeactivated,
}: DeleteEmployeeDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<'deactivate' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setError(null);
      setSubmittingAction(null);
      setIsSubmitting(false);
      onClose();
    }
  };

  const handleDeactivate = async () => {
    if (!employee) return;
    setError(null);
    setIsSubmitting(true);
    setSubmittingAction('deactivate');

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/employees/${employee.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: 'TERMINATED' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to deactivate employee (${res.status})`);
      }

      onEmployeeDeletedOrDeactivated('deactivated', employee);
      handleOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to deactivate employee');
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  const handleDeletePermanently = async () => {
    if (!employee) return;
    setError(null);
    setIsSubmitting(true);
    setSubmittingAction('delete');

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/employees/${employee.id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to delete employee (${res.status})`);
      }

      onEmployeeDeletedOrDeactivated('deleted', employee);
      handleOpenChange(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete employee');
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete or Deactivate Employee
          </DialogTitle>
          <DialogDescription>
            Choose whether to deactivate the employee or permanently delete their record.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive border border-destructive/20 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-lg border p-4 bg-muted/30 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Employee:</span>
              <span className="font-semibold text-foreground">{employee.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="text-foreground">{employee.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Department:</span>
              <span className="text-foreground">{employee.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Status:</span>
              <span className="font-medium text-foreground">{employee.status}</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              • <strong>Deactivate:</strong> Sets status to <em>Terminated</em>. Retains past activity, tasks, and historical records.
            </p>
            <p>
              • <strong>Delete:</strong> Permanently removes the employee profile and linked user account from the system.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 flex flex-col sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleDeactivate}
            disabled={isSubmitting || employee.status === 'TERMINATED'}
          >
            {submittingAction === 'deactivate' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deactivating...
              </>
            ) : (
              <>
                <UserX className="h-4 w-4 mr-2" />
                Deactivate
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeletePermanently}
            disabled={isSubmitting}
          >
            {submittingAction === 'delete' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
