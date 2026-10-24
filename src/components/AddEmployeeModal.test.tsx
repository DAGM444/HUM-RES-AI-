import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { AddEmployeeModal } from './AddEmployeeModal';
import * as auth from '../lib/auth';

describe('AddEmployeeModal', () => {
  const mockOnClose = vi.fn();
  const mockOnEmployeeAdded = vi.fn();
  const mockManagers = [
    { id: 1, name: 'Sarah Jenkins', department: 'HR' },
    { id: 2, name: 'Michael Scott', department: 'Management' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(auth, 'getToken').mockReturnValue('mock-jwt-token');
  });

  it('renders modal when isOpen is true', () => {
    render(
      <AddEmployeeModal
        isOpen={true}
        onClose={mockOnClose}
        onEmployeeAdded={mockOnEmployeeAdded}
        managers={mockManagers}
      />
    );

    expect(screen.getByText('Add New Employee')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Department/i)).toBeInTheDocument();
  });

  it('shows error if required fields are missing on submit', async () => {
    render(
      <AddEmployeeModal
        isOpen={true}
        onClose={mockOnClose}
        onEmployeeAdded={mockOnEmployeeAdded}
        managers={mockManagers}
      />
    );

    // Click submit without filling form
    fireEvent.click(screen.getByRole('button', { name: /Add Employee/i }));

    expect(screen.getByText(/Employee name is required/i)).toBeInTheDocument();
  });

  it('submits properly formatted POST /api/employees request with auth header', async () => {
    const mockCreatedEmployee = {
      id: 99,
      name: 'John Doe',
      email: 'john.doe@company.com',
      role: 'EMPLOYEE',
      department: 'Engineering',
      status: 'ACTIVE',
      performanceScore: 4.5,
      joinDate: '2026-03-01T00:00:00.000Z',
      location: 'Remote',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreatedEmployee,
    } as Response);

    render(
      <AddEmployeeModal
        isOpen={true}
        onClose={mockOnClose}
        onEmployeeAdded={mockOnEmployeeAdded}
        managers={mockManagers}
      />
    );

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'John Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'john.doe@company.com' },
    });
    fireEvent.change(screen.getByLabelText(/Department/i), {
      target: { value: 'Engineering' },
    });
    fireEvent.change(screen.getByLabelText(/Performance Score/i), {
      target: { value: '4.5' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Employee/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toContain('/api/employees');
    expect(options?.method).toBe('POST');
    expect(options?.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer mock-jwt-token',
    });

    const body = JSON.parse(options?.body as string);
    expect(body.name).toBe('John Doe');
    expect(body.email).toBe('john.doe@company.com');
    expect(body.department).toBe('Engineering');
    expect(body.performanceScore).toBe(4.5);

    await waitFor(() => {
      expect(mockOnEmployeeAdded).toHaveBeenCalledWith(mockCreatedEmployee);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('handles API error responses gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: 'An employee with this email already exists' }),
    } as Response);

    render(
      <AddEmployeeModal
        isOpen={true}
        onClose={mockOnClose}
        onEmployeeAdded={mockOnEmployeeAdded}
        managers={mockManagers}
      />
    );

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Existing User' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'existing@company.com' },
    });
    fireEvent.change(screen.getByLabelText(/Department/i), {
      target: { value: 'Engineering' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Add Employee/i }));

    await waitFor(() => {
      expect(screen.getByText(/An employee with this email already exists/i)).toBeInTheDocument();
    });

    expect(mockOnEmployeeAdded).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
