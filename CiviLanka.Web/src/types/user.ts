export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  contactPhone?: string;
  role: string;
  roles: string[];
  createdAt: string;
  isLockedOut: boolean;
  hazardsReported: number;
  assignedWorkOrders: number;
  executedMaintenances: number;
}

export interface UpdateProfileRequest {
  fullName: string;
  contactPhone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  contactPhone?: string;
  role: string;
  roles: string[];
  createdAt: string;
  isLockedOut: boolean;
  hazardsReported: number;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  role: string;
  contactPhone?: string;
  password: string;
}

export interface UpdateUserRequest {
  fullName: string;
  role: string;
  contactPhone?: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}
