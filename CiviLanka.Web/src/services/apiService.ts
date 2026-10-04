import axios, { AxiosError } from 'axios';

export const getBackendApiUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();
  const isCloudHost =
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  if (!envUrl || (isCloudHost && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')))) {
    return 'https://civilanka-a3gqebh7h4f0f6gy.indiasouthcentral-01.azurewebsites.net';
  }
  return envUrl;
};

export const apiClient = axios.create({
  baseURL: getBackendApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 20000,
});

// Automatically inject JWT token into requests and ensure correct baseURL
apiClient.interceptors.request.use((config) => {
  config.baseURL = getBackendApiUrl();
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
