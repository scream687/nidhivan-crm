import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    // A 401 from the auth endpoints means bad credentials, not an expired session.
    // Running the refresh-and-redirect path here reloads /login mid-submit, which
    // wipes the form and destroys the error toast — the sign-in button looks dead.
    const isAuthEndpoint = /\/auth\/(login|refresh|google)\b/.test(original?.url || '');
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/refresh`, { refreshToken }, { withCredentials: true }).catch(() => ({ data: null }));
      if (!data) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    }
    return Promise.reject(error);
  },
);

/**
 * Paginated endpoints answer with an envelope — { data, total, page, limit }
 * for most, { items, nextCursor, total } for communication — while others
 * return a bare array. Assigning a response body straight into array state is
 * what produced "users.map is not a function" across the app, so list-shaped
 * reads should route through here instead of trusting the shape.
 */
export function toList<T = any>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  const envelope = body as { data?: unknown; items?: unknown } | null;
  if (Array.isArray(envelope?.data)) return envelope!.data as T[];
  if (Array.isArray(envelope?.items)) return envelope!.items as T[];
  return [];
}

export default api;
