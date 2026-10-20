import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveAuth,
  getToken,
  getStoredUser,
  clearAuth,
  isAuthenticated,
  authHeader,
  AuthUser,
} from './auth';

describe('Frontend auth helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockUser: AuthUser = {
    id: 1,
    email: 'hr@example.com',
    role: 'ADMIN',
    name: 'HR Admin',
    employeeId: 42,
  };

  it('should save and retrieve token and user from localStorage', () => {
    saveAuth('sample-token-xyz', mockUser);

    expect(getToken()).toBe('sample-token-xyz');
    expect(getStoredUser()).toEqual(mockUser);
  });

  it('should clear authentication data', () => {
    saveAuth('sample-token-xyz', mockUser);
    clearAuth();

    expect(getToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('should return empty auth header when no token is present', () => {
    expect(authHeader()).toEqual({});
  });

  it('should return Authorization header with Bearer when token is present', () => {
    saveAuth('valid-token-123', mockUser);
    expect(authHeader()).toEqual({ Authorization: 'Bearer valid-token-123' });
  });

  it('should determine authentication correctly based on token expiry', () => {
    expect(isAuthenticated()).toBe(false);

    // Create a mock unexpired JWT
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const validPayload = btoa(JSON.stringify({ exp: futureExp }));
    const validJwt = `header.${validPayload}.signature`;

    saveAuth(validJwt, mockUser);
    expect(isAuthenticated()).toBe(true);

    // Create an expired JWT
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const expiredPayload = btoa(JSON.stringify({ exp: pastExp }));
    const expiredJwt = `header.${expiredPayload}.signature`;

    saveAuth(expiredJwt, mockUser);
    expect(isAuthenticated()).toBe(false);
    expect(getToken()).toBeNull(); // Should have cleaned up expired token
  });
});
