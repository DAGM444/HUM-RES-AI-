import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../lib/theme';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('renders sun/moon toggle button and toggles dark mode on click', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    // Initial state: light mode, shows moon icon / title switch to dark
    const button = screen.getByRole('button', { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Click to switch to dark
    act(() => {
      fireEvent.click(button);
    });

    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // Click to switch back to light
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /switch to light mode/i }));
    });

    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('renders with label when showLabel is true', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle showLabel />
      </ThemeProvider>
    );

    expect(screen.getByText('Dark Mode')).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('Light Mode')).toBeInTheDocument();
  });
});
