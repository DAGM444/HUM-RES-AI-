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

describe('EmployeeDirectory - 3-dots actions dropdown menu', () => {
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

  it('toggles dropdown menu open and closes when clicking outside', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployees,
    } as Response);

    render(<EmployeeDirectory />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
    });

    // Find 3-dots actions button
    const actionsButton = screen.getByLabelText(/Actions for Sarah Jenkins/i);
    expect(actionsButton).toBeInTheDocument();

    // Menu should initially not be in the document
    expect(screen.queryByRole('menu', { name: /Employee Actions/i })).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(actionsButton);

    expect(screen.getByRole('menu', { name: /Employee Actions/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /View Profile/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Edit Employee/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Delete \/ Deactivate/i })).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: /Employee Actions/i })).not.toBeInTheDocument();
    });
  });

  it('navigates to profile when "View Profile" is clicked', async () => {
    const mockNavigateProfile = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployees,
    } as Response);

    render(<EmployeeDirectory onNavigateToProfile={mockNavigateProfile} />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Actions for Sarah Jenkins/i));
    fireEvent.click(screen.getByRole('menuitem', { name: /View Profile/i }));

    expect(mockNavigateProfile).toHaveBeenCalledWith(1);
    expect(screen.queryByRole('menu', { name: /Employee Actions/i })).not.toBeInTheDocument();
  });

  it('opens EditEmployeeModal when "Edit Employee" is clicked and saves changes', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees,
      } as Response) // initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockEmployees[0],
          name: 'Sarah Jenkins Updated',
          department: 'Executive HR',
        }),
      } as Response) // PUT /api/employees/1
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            ...mockEmployees[0],
            name: 'Sarah Jenkins Updated',
            department: 'Executive HR',
          },
        ],
      } as Response); // refresh fetchEmployees

    render(<EmployeeDirectory />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Actions for Sarah Jenkins/i));
    fireEvent.click(screen.getByRole('menuitem', { name: /Edit Employee/i }));

    // Edit modal should open
    expect(screen.getByText(/Edit Employee Details/i)).toBeInTheDocument();
    const nameInput = screen.getByLabelText(/Full Name/i);
    expect(nameInput).toHaveValue('Sarah Jenkins');

    fireEvent.change(nameInput, { target: { value: 'Sarah Jenkins Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/employees/1'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-jwt-token',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Employee "Sarah Jenkins Updated" was updated successfully!/i)
      ).toBeInTheDocument();
    });
  });

  it('opens DeleteEmployeeDialog and deactivates employee', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmployees,
      } as Response) // initial load
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockEmployees[0],
          status: 'TERMINATED',
        }),
      } as Response) // PATCH /api/employees/1/status
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            ...mockEmployees[0],
            status: 'TERMINATED',
          },
        ],
      } as Response); // refresh fetchEmployees

    render(<EmployeeDirectory />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Actions for Sarah Jenkins/i));
    fireEvent.click(screen.getByRole('menuitem', { name: /Delete \/ Deactivate/i }));

    // Delete/Deactivate dialog should be open
    expect(screen.getByText(/Delete or Deactivate Employee/i)).toBeInTheDocument();

    const deactivateBtn = screen.getByRole('button', { name: /Deactivate/i });
    fireEvent.click(deactivateBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/employees/1/status'),
        expect.objectContaining({
          method: 'PATCH',
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-jwt-token',
          }),
          body: JSON.stringify({ status: 'TERMINATED' }),
        })
      );
    });
  });
});

describe('EmployeeDirectory - CSV Export functionality', () => {
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
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('exports employee data to a CSV file when Export button is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployees,
    } as Response);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<EmployeeDirectory />);

    await waitFor(() => {
      expect(screen.getByText('Sarah Jenkins')).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    await waitFor(() => {
      expect(screen.getByText(/Exported 1 employee to CSV!/i)).toBeInTheDocument();
    });
  });

  it('handles empty list edge case by showing notification without downloading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<EmployeeDirectory />);

    await waitFor(() => {
      expect(screen.getByText(/Showing 0–0 of 0 profiles/i)).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportBtn);

    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText(/No employees available to export\./i)).toBeInTheDocument();
    });
  });
});
