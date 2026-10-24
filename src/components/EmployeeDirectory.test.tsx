import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { EmployeeDirectory } from './EmployeeDirectory';
import * as auth from '../lib/auth';

describe('EmployeeDirectory - Add Employee integration', () => {
  const mockEmployees = [
    {
      id: 1,
      name: 'Sarah Jenkins',
      email: 'sarah.j@company.com',
      role: 'HR',
      department: 'Human Resources',
      performanceScore: 4.8,
      status: 'ACTIVE',
      joinDate: '2022-01-15T00:00:00.000Z',
      avatar: 'https://avatar.url/1',
      location: 'New York',
      manager: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(auth, 'getToken').mockReturnValue('mock-jwt-token');
  });

  it('opens AddEmployeeModal when Add Employee button is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployees,
    } as Response);

    render(<EmployeeDirectory />);

    // Wait for initial employee list to load
    await waitFor(() => {
      expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
    });

    // Find and click the Add Employee button in the header
    const addEmployeeButton = screen.getByRole('button', { name: /Add Employee/i });
    expect(addEmployeeButton).toBeInTheDocument();

    fireEvent.click(addEmployeeButton);

    // Modal should now be open
    expect(screen.getByText('Add New Employee')).toBeInTheDocument();
    expect(
      screen.getByText(/Enter the employee's personal and organizational details/i)
    ).toBeInTheDocument();
  });

  it('refreshes the list when an employee is successfully added', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees,
      } as Response) // initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          name: 'New Person',
          email: 'new@company.com',
          role: 'EMPLOYEE',
          department: 'Engineering',
          status: 'ACTIVE',
          performanceScore: 5.0,
          joinDate: '2026-03-01T00:00:00.000Z',
          location: 'Remote',
        }),
      } as Response) // POST /api/employees
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          ...mockEmployees,
          {
            id: 2,
            name: 'New Person',
            email: 'new@company.com',
            role: 'EMPLOYEE',
            department: 'Engineering',
            performanceScore: 5.0,
            status: 'ACTIVE',
            joinDate: '2026-03-01T00:00:00.000Z',
            location: 'Remote',
            manager: null,
          },
        ],
      } as Response); // refreshed fetchEmployees

    render(<EmployeeDirectory />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
    });

    // Click Add Employee button
    fireEvent.click(screen.getByRole('button', { name: /Add Employee/i }));

    // Fill form in the modal
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'New Person' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'new@company.com' },
    });
    fireEvent.change(screen.getByLabelText(/Department/i), {
      target: { value: 'Engineering' },
    });

    // Submit modal form
    const submitBtn = screen.getAllByRole('button', { name: /Add Employee/i }).pop()!;
    fireEvent.click(submitBtn);

    // Wait for the refreshed list to be requested
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    // Success notification should be displayed
    await waitFor(() => {
      expect(
        screen.getByText(/Employee "New Person" was added successfully!/i)
      ).toBeInTheDocument();
    });
  });
});
