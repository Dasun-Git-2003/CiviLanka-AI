import { apiClient, getErrorMessage } from './apiService';
import type {
  UserProfile,
  UpdateProfileRequest,
  ChangePasswordRequest,
  UserListItem,
  CreateUserRequest,
  UpdateUserRequest,
  ResetPasswordRequest,
} from '../types/user';

export const userService = {
  // 1. Current user profile
  getMe: async (): Promise<UserProfile> => {
    try {
      const response = await apiClient.get<UserProfile>('/api/users/me');
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 2. Update current profile
  updateMe: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    try {
      const response = await apiClient.put<UserProfile>('/api/users/me', data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 3. Change password
  changePassword: async (data: ChangePasswordRequest): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post<{ message: string }>(
        '/api/users/me/change-password',
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 4. Get all users (Admin/Management)
  getAll: async (params?: { search?: string; role?: string }): Promise<UserListItem[]> => {
    try {
      const response = await apiClient.get<UserListItem[]>('/api/users', { params });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 5. Get user by ID
  getById: async (id: string): Promise<UserProfile> => {
    try {
      const response = await apiClient.get<UserProfile>(`/api/users/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 6. Create new user
  create: async (data: CreateUserRequest): Promise<UserListItem> => {
    try {
      const response = await apiClient.post<UserListItem>('/api/users', data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 7. Update user
  update: async (id: string, data: UpdateUserRequest): Promise<UserListItem> => {
    try {
      const response = await apiClient.put<UserListItem>(`/api/users/${id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 8. Toggle account lock
  toggleLock: async (id: string): Promise<{ message: string; isLockedOut: boolean }> => {
    try {
      const response = await apiClient.post<{ message: string; isLockedOut: boolean }>(
        `/api/users/${id}/toggle-lock`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 9. Admin reset password
  resetPassword: async (id: string, data: ResetPasswordRequest): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post<{ message: string }>(
        `/api/users/${id}/reset-password`,
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 10. Delete user
  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/users/${id}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};
