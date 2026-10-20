import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn utility', () => {
  it('should merge class names correctly', () => {
    expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
  });

  it('should handle conditional and falsy class names', () => {
    expect(cn('base', false && 'hidden', null, undefined, 'extra')).toBe('base extra');
  });

  it('should resolve tailwind class conflicts with last one winning', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});
