// Configuration file for managing environment-specific settings.
// VITE_API_URL should be set in the .env file when deploying the frontend separately.
// For example: VITE_API_URL="https://your-backend-service.onrender.com"
export const API_BASE = import.meta.env.VITE_API_URL || '';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('saas_auth_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem('saas_auth_token', token);
  } catch {
    // ignore
  }
}

export function removeAuthToken(): void {
  try {
    localStorage.removeItem('saas_auth_token');
  } catch {
    // ignore
  }
}

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...extraHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const modifiedInit: RequestInit = { ...init };
  const headers = new Headers(modifiedInit.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  modifiedInit.headers = headers;
  return fetch(input, modifiedInit);
}

