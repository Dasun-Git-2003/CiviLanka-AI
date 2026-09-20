import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import type { UserRole, Permission } from '../config/rbac';
import { hasAnyRole, can } from '../utils/rbac';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: UserRole[];
  permission?: Permission;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  permission,
}) => {
  const location = useLocation();
  const user = authService.getCurrentUser();
  const isAuthenticated = authService.isAuthenticated();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasAnyRole(user.role, allowedRoles)) {
    return (
      <Navigate
        to="/403"
        replace
        state={{ attemptedPath: location.pathname, requiredRoles: allowedRoles }}
      />
    );
  }

  if (permission && !can(user.role, permission)) {
    return (
      <Navigate
        to="/403"
        replace
        state={{ attemptedPath: location.pathname, requiredPermission: permission }}
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
