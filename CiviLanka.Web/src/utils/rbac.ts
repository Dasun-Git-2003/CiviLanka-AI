import { ROLE_PERMISSIONS, ROLE_CONFIG } from '../config/rbac';
import type { UserRole, Permission, RoleMeta } from '../config/rbac';

/**
 * Normalizes any role string to one of the four canonical UserRole values.
 * Handles legacy, lowercase, and variant values seamlessly.
 */
export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'Citizen';

  const clean = role.trim().toLowerCase().replace(/[\s_-]/g, '');

  if (clean.includes('director')) return 'PublicWorksDirector';
  if (clean.includes('supervisor')) return 'FieldMaintenanceSupervisor';
  if (clean.includes('worker')) return 'FieldWorker';
  if (clean.includes('staff')) return 'FieldMaintenanceSupervisor';
  if (clean.includes('citizen')) return 'Citizen';

  return 'Citizen';
}

/**
 * Checks if the user has the exact required role.
 */
export function hasRole(userRole: string | undefined | null, requiredRole: UserRole): boolean {
  return normalizeRole(userRole) === requiredRole;
}

/**
 * Checks if the user has any of the specified allowed roles.
 */
export function hasAnyRole(userRole: string | undefined | null, allowedRoles: UserRole[]): boolean {
  const current = normalizeRole(userRole);
  return allowedRoles.includes(current);
}

/**
 * Checks if the user has permission to perform a specific action.
 */
export function can(userRole: string | undefined | null, permission: Permission): boolean {
  const current = normalizeRole(userRole);
  const permissions = ROLE_PERMISSIONS[current] || [];
  return permissions.includes(permission);
}

/**
 * Returns the default dashboard/landing route for a given user role.
 */
export function getRedirectPathForRole(userRole?: string | null): string {
  const current = normalizeRole(userRole);
  return ROLE_CONFIG[current]?.defaultRoute || '/citizen';
}

/**
 * Returns metadata (label, styling badge, description) for a role.
 */
export function getRoleMeta(userRole?: string | null): RoleMeta {
  const current = normalizeRole(userRole);
  return ROLE_CONFIG[current] || ROLE_CONFIG.Citizen;
}
