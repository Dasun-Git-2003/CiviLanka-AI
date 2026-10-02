class ApiConstants {
  static const String defaultBaseUrl = 'http://localhost:5000';
  static const String defaultAgentUrl = 'http://localhost:8001';

  // Auth endpoints
  static const String login = '/api/auth/login';
  static const String register = '/api/auth/register';

  // Hazard endpoints
  static const String hazards = '/api/hazards';
  static const String myHazards = '/api/hazards/my';
  static const String mapHazards = '/api/hazards/map';
  static const String uploadHazardImage = '/api/hazards/upload-image';

  // Work Order endpoints
  static const String workOrders = '/api/workorders';
  static const String pendingApprovals = '/api/workorders/pending-approval';

  // Maintenance endpoints
  static const String maintenanceRecords = '/api/maintenance-records';
  static const String myAssignedMaintenance =
      '/api/maintenance-records/my-assigned';
  static const String pendingVerification =
      '/api/maintenance-records/verification-queue';

  // AI Orchestration endpoints
  static const String aiDashboard = '/api/ai/dashboard';
  static const String aiDispatchOptimize = '/api/ai/dispatch/optimize';
  static const String aiOverride = '/api/ai/override';

  // Analytics & Audit
  static const String analyticsVisualizations = '/api/analytics/visualizations';
  static const String auditEvents = '/api/audit';
  static const String userMe = '/api/users/me';
}

class AppRoles {
  static const String citizen = 'Citizen';
  static const String fieldWorker = 'FieldWorker';
  static const String supervisor = 'FieldMaintenanceSupervisor';
  static const String director = 'PublicWorksDirector';
  static const String municipalStaff = 'MunicipalStaff';

  static const List<String> all = [
    citizen,
    fieldWorker,
    supervisor,
    director,
    municipalStaff,
  ];

  static String getDisplayName(String role) {
    switch (role) {
      case citizen:
        return 'Citizen';
      case fieldWorker:
        return 'Field Worker';
      case supervisor:
        return 'Field Maintenance Supervisor';
      case director:
        return 'Public Works Director';
      case municipalStaff:
        return 'Municipal Staff';
      default:
        return role;
    }
  }
}

class HazardCategories {
  static const String roadDamage = 'Road Damage';
  static const String waterLeak = 'Water Leak';
  static const String trafficSignal = 'Traffic Signal';
  static const String drainage = 'Drainage';
  static const String streetLight = 'Street Light';
  static const String garbage = 'Garbage';
  static const String fallenTree = 'Fallen Tree';
  static const String structuralCollapse = 'Structural Collapse';
  static const String other = 'Other';

  static const List<String> all = [
    roadDamage,
    waterLeak,
    trafficSignal,
    drainage,
    streetLight,
    garbage,
    fallenTree,
    structuralCollapse,
    other,
  ];
}

class PriorityLevels {
  static const String low = 'LOW';
  static const String normal = 'NORMAL';
  static const String high = 'HIGH';
  static const String urgent = 'URGENT';
  static const String critical = 'CRITICAL';

  static const List<String> all = [low, normal, high, urgent, critical];
}

class SeverityLevels {
  static const String low = 'Low';
  static const String medium = 'Medium';
  static const String high = 'High';
  static const String critical = 'Critical';

  static const List<String> all = [low, medium, high, critical];
}

class WorkOrderStatuses {
  static const String aiGenerated = 'AI_GENERATED';
  static const String pendingApproval = 'PENDING_APPROVAL';
  static const String approved = 'APPROVED';
  static const String rejected = 'REJECTED';
  static const String assigned = 'ASSIGNED';
  static const String scheduled = 'SCHEDULED';
  static const String inProgress = 'IN_PROGRESS';
  static const String completed = 'COMPLETED';
  static const String verified = 'VERIFIED';
  static const String closed = 'CLOSED';
  static const String cancelled = 'CANCELLED';

  static const List<String> all = [
    aiGenerated,
    pendingApproval,
    approved,
    rejected,
    assigned,
    scheduled,
    inProgress,
    completed,
    verified,
    closed,
    cancelled,
  ];
}
