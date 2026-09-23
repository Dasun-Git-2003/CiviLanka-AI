export type UserRole =
  | 'Citizen'
  | 'FieldWorker'
  | 'FieldMaintenanceSupervisor'
  | 'PublicWorksDirector';

export type Permission =
  | 'REPORT_HAZARD'
  | 'VIEW_HAZARDS'
  | 'MANAGE_HAZARDS'
  | 'VIEW_INFRASTRUCTURE'
  | 'MANAGE_INFRASTRUCTURE'
  | 'CREATE_WORK_ORDER'
  | 'MANAGE_WORK_ORDERS'
  | 'APPROVE_WORK_ORDER'
  | 'SUBMIT_MAINTENANCE'
  | 'VERIFY_MAINTENANCE'
  | 'VIEW_AI_ANALYSIS'
  | 'MANAGE_CONTRACTORS'
  | 'VIEW_BUDGET'
  | 'MANAGE_BUDGET'
  | 'VIEW_AUDIT_LOGS'
  | 'MANAGE_USERS'
  | 'MANAGE_SETTINGS';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  Citizen: [
    'REPORT_HAZARD',
    'VIEW_INFRASTRUCTURE',
  ],
  FieldWorker: [
    'VIEW_INFRASTRUCTURE',
    'SUBMIT_MAINTENANCE',
  ],
  FieldMaintenanceSupervisor: [
    'VIEW_HAZARDS',
    'MANAGE_HAZARDS',
    'VIEW_INFRASTRUCTURE',
    'MANAGE_INFRASTRUCTURE',
    'CREATE_WORK_ORDER',
    'MANAGE_WORK_ORDERS',
    'SUBMIT_MAINTENANCE',
    'VERIFY_MAINTENANCE',
    'VIEW_AI_ANALYSIS',
    'MANAGE_CONTRACTORS',
    'VIEW_BUDGET',
    'VIEW_AUDIT_LOGS',
  ],
  PublicWorksDirector: [
    'VIEW_HAZARDS',
    'MANAGE_HAZARDS',
    'VIEW_INFRASTRUCTURE',
    'MANAGE_INFRASTRUCTURE',
    'CREATE_WORK_ORDER',
    'MANAGE_WORK_ORDERS',
    'APPROVE_WORK_ORDER',
    'SUBMIT_MAINTENANCE',
    'VERIFY_MAINTENANCE',
    'VIEW_AI_ANALYSIS',
    'MANAGE_CONTRACTORS',
    'VIEW_BUDGET',
    'MANAGE_BUDGET',
    'VIEW_AUDIT_LOGS',
    'MANAGE_USERS',
    'MANAGE_SETTINGS',
  ],
};

export interface RoleMeta {
  role: UserRole;
  label: string;
  badgeClass: string;
  defaultRoute: string;
  description: string;
}

export const ROLE_CONFIG: Record<UserRole, RoleMeta> = {
  Citizen: {
    role: 'Citizen',
    label: 'Citizen Community Member',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    defaultRoute: '/citizen',
    description: 'Report hazards, monitor public municipal fixes, and track community safety.',
  },
  FieldWorker: {
    role: 'FieldWorker',
    label: 'Field Operations Crew',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    defaultRoute: '/field-worker',
    description: 'Inspect assigned work orders, record field repairs, and upload safety evidence.',
  },
  FieldMaintenanceSupervisor: {
    role: 'FieldMaintenanceSupervisor',
    label: 'Field Maintenance Supervisor',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    defaultRoute: '/dashboard',
    description: 'Coordinate field crews, verify maintenance quality, track operational budgets.',
  },
  PublicWorksDirector: {
    role: 'PublicWorksDirector',
    label: 'Public Works Director',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    defaultRoute: '/dashboard',
    description: 'Full municipal executive authority: approvals, fiscal thresholds, and governance.',
  },
};
