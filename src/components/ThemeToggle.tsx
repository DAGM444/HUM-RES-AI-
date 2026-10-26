import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button, ButtonProps } from './ui/button';
import { useTheme } from '../lib/theme';
import { cn } from '../lib/utils';

export interface ThemeToggleProps extends Omit<ButtonProps, 'onClick'> {
  showLabel?: boolean;
}

export function ThemeToggle({
  showLabel = false,
  className,
  variant = 'ghost',
  size = 'icon',
  ...props
}: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant={variant}
      size={showLabel ? (size === 'icon' ? 'sm' : size) : size}
      onClick={toggleTheme}
      className={cn(
        'relative cursor-pointer transition-colors text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800',
        className
      )}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      {...props}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-600 transition-transform duration-200 -rotate-12 hover:rotate-0" />
      )}
      {showLabel && (
        <span className="ml-2 font-medium text-xs">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </Button>
  );
}
