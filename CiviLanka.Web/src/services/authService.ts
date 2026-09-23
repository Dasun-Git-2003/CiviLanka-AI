import { apiClient, getErrorMessage } from './apiService';
import { getRedirectPathForRole } from '../utils/rbac';

export interface User {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'civitaguard_user';

export const authService = {
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const res = await apiClient.post<User>('/api/auth/login', credentials);
      const user = res.data;
      if (user?.token) {
        localStorage.setItem(TOKEN_KEY, user.token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      return user;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  async register(data: RegisterInput): Promise<User> {
    try {
      const res = await apiClient.post<User>('/api/auth/register', data);
      const user = res.data;
      if (user?.token) {
        localStorage.setItem(TOKEN_KEY, user.token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
      return user;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem(TOKEN_KEY);
    return Boolean(token);
  },

  async getMe(): Promise<User | null> {
    try {
      const res = await apiClient.get<User>('/api/auth/me');
      if (res.data) {
        const existing = this.getCurrentUser() || {};
        const updated = { ...existing, ...res.data };
        localStorage.setItem(USER_KEY, JSON.stringify(updated));
        return updated as User;
      }
      return null;
    } catch {
      return this.getCurrentUser();
    }
  },

  getRedirectPathForRole(role?: string): string {
    return getRedirectPathForRole(role);
  },
};
