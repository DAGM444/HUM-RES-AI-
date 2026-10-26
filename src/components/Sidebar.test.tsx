import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { SidebarProvider } from './ui/sidebar';

function renderSidebar(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <SidebarProvider>
        <AppSidebar {...props} />
      </SidebarProvider>
    </MemoryRouter>
  );
}

describe('Sidebar Navigation and Collapse functionality', () => {
  it('renders "Employee Directory" only once under "HR Functions", not under "Application"', () => {
    renderSidebar();

    // Verify sections
    expect(screen.getByText('Application')).toBeInTheDocument();
    expect(screen.getByText('HR Functions')).toBeInTheDocument();

    // Query all "Employee Directory" buttons / text elements
    const directoryItems = screen.getAllByText('Employee Directory');
    expect(directoryItems).toHaveLength(1);

    // Verify it is located within the HR Functions section
    const hrFunctionsHeading = screen.getByText('HR Functions');
    const hrSection = hrFunctionsHeading.closest('[data-sidebar="group"]');
    expect(hrSection).not.toBeNull();
    expect(hrSection).toHaveTextContent('Employee Directory');

    // Verify Application section does not have Employee Directory
    const appHeading = screen.getByText('Application');
    const appSection = appHeading.closest('[data-sidebar="group"]');
    expect(appSection).not.toBeNull();
    expect(appSection).not.toHaveTextContent('Employee Directory');
  });

  it('renders the sidebar collapse toggle button next to the "HR Management" brand header', () => {
    renderSidebar();

    // Brand header
    const brand = screen.getByText('HR Management');
    expect(brand).toBeInTheDocument();

    // Collapse button should be present in the sidebar header
    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
    expect(collapseBtn).toBeInTheDocument();

    // Header container contains both brand and collapse button
    const header = collapseBtn.closest('[data-sidebar="header"]');
    expect(header).not.toBeNull();
    expect(header).toContainElement(brand);
  });

  it('toggles between expanded and collapsed states smoothly when minimize/expand button is clicked', () => {
    renderSidebar();

    // Initial state: expanded
    expect(screen.getByText('HR Management')).toBeInTheDocument();
    expect(screen.getByText('Application')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Employee Directory')).toBeInTheDocument();

    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(collapseBtn);

    // After collapsing: labels and brand text are hidden (icons-only mode)
    expect(screen.queryByText('Application')).not.toBeInTheDocument();
    expect(screen.queryByText('HR Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Employee Directory')).not.toBeInTheDocument();

    // Expand button is now rendered at the top
    const expandBtn = screen.getByRole('button', { name: /expand sidebar/i });
    expect(expandBtn).toBeInTheDocument();

    // Click expand button to restore full sidebar
    fireEvent.click(expandBtn);

    // Sidebar items and brand header should be restored
    expect(screen.getByText('HR Management')).toBeInTheDocument();
    expect(screen.getByText('Application')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Employee Directory')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
  });

  it('calls onNavigate callback when clicking navigation items', () => {
    const mockOnNavigate = vi.fn();
    renderSidebar({ onNavigate: mockOnNavigate });

    const hrInboxBtn = screen.getByText('Inbox').closest('button');
    expect(hrInboxBtn).not.toBeNull();
    fireEvent.click(hrInboxBtn!);

    expect(mockOnNavigate).toHaveBeenCalledWith('/inbox');
  });
});
