import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Automatically inject JWT token into requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle unauthorized and forbidden responses
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.warn('[API] 401 Unauthorized. Session expired or missing token.');
      localStorage.removeItem('token');
      localStorage.removeItem('civitaguard_user');
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login?expired=true';
      }
    } else if (error.response?.status === 403) {
      console.warn('[API] 403 Forbidden. Access denied for this resource.');
      if (!window.location.pathname.startsWith('/403')) {
        window.location.href = '/403';
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined;
    if (data?.message) return data.message;
    if (data?.errors) {
      return Object.values(data.errors).flat().join(', ');
    }
    return error.message || 'An error occurred while connecting to the server.';
  }
  return (error as Error).message || 'An unexpected error occurred.';
}
