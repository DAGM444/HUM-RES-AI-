// ---------------------------------------------------------------------------
// Auth state management — stored in localStorage and accessible app-wide.
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  name: string;
  employeeId: number | null;
}

const TOKEN_KEY = 'hum_res_token';
const USER_KEY  = 'hum_res_user';

export function saveAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  // Lightweight expiry check without a library — decode the payload part
  try {
    const payloadB64 = token.split('.')[1];
    const decoded = JSON.parse(atob(payloadB64)) as { exp?: number };
    if (decoded.exp && Date.now() / 1000 > decoded.exp) {
      clearAuth(); // token expired — clean up
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Convenience: build the Authorization header value for fetch calls */
export function authHeader(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
