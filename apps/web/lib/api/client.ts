'use client';

import { useAuthStore } from '@/stores/useAuthStore';

const BASE_URL = ''; // Empty string so it routes via Next.js rewrites in the browser, or absolute on server

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

async function request(endpoint: string, options: RequestOptions = {}): Promise<unknown> {
  const { params, headers, ...rest } = options;
  const store = useAuthStore.getState();

  // Construct URL
  let url = `${BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  // Setup headers
  const reqHeaders = new Headers(headers);
  if (!reqHeaders.has('Content-Type') && !(rest.body instanceof FormData)) {
    reqHeaders.set('Content-Type', 'application/json');
  }

  // Add auth token if exists
  if (store.accessToken) {
    reqHeaders.set('Authorization', `Bearer ${store.accessToken}`);
  }

  const config: RequestInit = {
    ...rest,
    headers: reqHeaders,
    credentials: 'include', // Important to pass the httpOnly cookie for refresh token
  };

  try {
    const response = await fetch(url, config);

    // If unauthorized, attempt token refresh
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshResponse = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            const newToken = data.access_token;
            store.updateAccessToken(newToken);
            isRefreshing = false;
            onRefreshed(newToken);
          } else {
            // Refresh failed, clear state and redirect to connexion
            isRefreshing = false;
            store.logout();
            if (typeof window !== 'undefined') {
              window.location.href = `/connexion?expired=true`;
            }
            throw new ApiError('Session expirée. Veuillez vous reconnecter.', response.status, null);
          }
        } catch (error) {
          isRefreshing = false;
          store.logout();
          if (typeof window !== 'undefined') {
            window.location.href = `/connexion?expired=true`;
          }
          throw error;
        }
      }

      // Wait for refresh to complete
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          reqHeaders.set('Authorization', `Bearer ${newToken}`);
          fetch(url, config)
            .then(async (res) => {
              if (!res.ok) {
                const errData = await res.json().catch(() => null);
                reject(new ApiError(errData?.message || 'Request failed after refresh', res.status, errData));
              } else {
                resolve(res.json().catch(() => null));
              }
            })
            .catch(reject);
        });
      });
    }

    // Handle normal errors
    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new ApiError(
        errData?.message || `Erreur serveur (${response.status})`,
        response.status,
        errData
      );
    }

    // Return JSON or empty if no content
    if (response.status === 204) {
      return null;
    }
    return await response.json().catch(() => null);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Une erreur réseau est survenue.',
      500,
      null
    );
  }
}

export const apiClient = {
  get: <T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> =>
    request(endpoint, { ...options, method: 'GET' }) as Promise<T>,
  post: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }) as Promise<T>,
  put: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }) as Promise<T>,
  patch: <T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> =>
    request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }) as Promise<T>,
  delete: <T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> =>
    request(endpoint, { ...options, method: 'DELETE' }) as Promise<T>,
};
