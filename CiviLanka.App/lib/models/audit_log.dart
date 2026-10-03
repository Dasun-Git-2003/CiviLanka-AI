class CivicAuditLog {
  final String id;
  final String eventType;
  final String action;
  final String performedBy;
  final String role;
  final String details;
  final String? entityType;
  final String? entityId;
  final DateTime timestamp;
  final bool isSuccess;
  final String? previousStatus;
  final String? newStatus;
  final String? ipAddress;
  final String? hash;

  CivicAuditLog({
    required this.id,
    required this.eventType,
    required this.action,
    required this.performedBy,
    required this.role,
    required this.details,
    this.entityType,
    this.entityId,
    required this.timestamp,
    this.isSuccess = true,
    this.previousStatus,
    this.newStatus,
    this.ipAddress,
    this.hash,
  });

  factory CivicAuditLog.fromJson(Map<String, dynamic> json) {
    return CivicAuditLog(
      id: json['id']?.toString() ?? '',
      eventType: json['eventType'] as String? ?? 'General',
      action: json['action'] as String? ?? 'Audit Entry',
      performedBy: json['performedBy'] as String? ?? 'System',
      role: json['role'] as String? ?? 'MunicipalStaff',
      details: json['details'] as String? ?? '',
      entityType: json['entityType'] as String?,
      entityId: json['entityId']?.toString(),
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
          : DateTime.now(),
      isSuccess: json['isSuccess'] as bool? ?? true,
      previousStatus: json['previousStatus'] as String?,
      newStatus: json['newStatus'] as String?,
      ipAddress: json['ipAddress'] as String?,
      hash: json['hash'] as String?,
    );
  }

  /// Authoritative fallback audit ledger representing Colombo Municipal Council security events
  static List<CivicAuditLog> get defaultFallbackLogs => [
    CivicAuditLog(
      id: 'aud-001',
      eventType: 'AI_SAFETY_AUDIT',
      action: 'SAFETY_GATEWAY_CERTIFIED',
      performedBy: 'Municipal Safety & Regulatory Audit Agent',
      role: 'Autonomous AI Safety Auditor',
      details: 'Work Order WO-2026-081 (Galle Road Mahogany Clearing) certified 100% compliant across SEC-PPE-01, FISC-DIR-01, EVID-IMG-01, GPS-TOL-01.',
      entityType: 'WorkOrder',
      entityId: 'WO-2026-081',
      timestamp: DateTime.now().subtract(const Duration(minutes: 14)),
      isSuccess: true,
      previousStatus: 'PendingAudit',
      newStatus: 'SafetyCertified',
      ipAddress: '10.0.88.14 (AI Agent Orchestrator)',
      hash: '0x8f2d9c12480e61b7f9a239a51cb7e441a542b8e392d471542f01ea89bc0192a3',
    ),
    CivicAuditLog(
      id: 'aud-002',
      eventType: 'DIRECTOR_EXECUTIVE',
      action: 'WORK_ORDER_APPROVED',
      performedBy: 'director@civilanka.gov.lk',
      role: 'PublicWorksDirector',
      details: 'Work order WO-2026-079 (Kelani River Bridge Guard Rail) approved with allocated budget of Rs. 450,000.',
      entityType: 'WorkOrder',
      entityId: 'WO-2026-079',
      timestamp: DateTime.now().subtract(const Duration(hours: 1, minutes: 22)),
      isSuccess: true,
      previousStatus: 'PendingDirectorApproval',
      newStatus: 'APPROVED',
      ipAddress: '192.168.10.42 (Director Executive Portal)',
      hash: '0xa37b5883ef4991c0e3a987d6103e6701bb2641f09e8751b3d7a85912446c8201',
    ),
    CivicAuditLog(
      id: 'aud-003',
      eventType: 'TREASURY_BUDGET',
      action: 'BUDGET_CAPITAL_ALLOCATION',
      performedBy: 'director@civilanka.gov.lk',
      role: 'PublicWorksDirector',
      details: 'Treasury capital allocation of Rs. 2,500,000 disbursed to [Roads & Highways Division - Colombo West].',
      entityType: 'TreasuryBudget',
      entityId: 'CAP-BUD-2026-Q4',
      timestamp: DateTime.now().subtract(const Duration(hours: 3, minutes: 45)),
      isSuccess: true,
      previousStatus: 'Unallocated',
      newStatus: 'Disbursed',
      ipAddress: '192.168.10.42 (Treasury Gateway TLS 1.3)',
      hash: '0xbc94271810459c08479e02316e885d01fe8094271c08475961e0847164920481',
    ),
    CivicAuditLog(
      id: 'aud-004',
      eventType: 'OPERATIONAL_MAINTENANCE',
      action: 'MAINTENANCE_RECORD_VERIFIED',
      performedBy: 'supervisor@civilanka.gov.lk',
      role: 'FieldMaintenanceSupervisor',
      details: 'Maintenance Record MR-2026-042 verified and approved. Labour: 14 hrs, Aggregate cost: Rs. 85,000.',
      entityType: 'MaintenanceRecord',
      entityId: 'MR-2026-042',
      timestamp: DateTime.now().subtract(const Duration(hours: 5, minutes: 10)),
      isSuccess: true,
      previousStatus: 'WorkCompleted',
      newStatus: 'Verified',
      ipAddress: '172.16.4.19 (Field Mobile Gateway)',
      hash: '0x1049285710492837491029384756102938475610293847561029384756102938',
    ),
    CivicAuditLog(
      id: 'aud-005',
      eventType: 'AI_SAFETY_AUDIT',
      action: 'SAFETY_GATEWAY_FLAGGED',
      performedBy: 'Municipal Safety & Regulatory Audit Agent',
      role: 'Autonomous AI Safety Auditor',
      details: 'Proximity violation detected on WO-2026-074: Field technician GPS offset was 68.2m (exceeds 50m tolerance). Flagged for supervisor review.',
      entityType: 'WorkOrder',
      entityId: 'WO-2026-074',
      timestamp: DateTime.now().subtract(const Duration(hours: 8, minutes: 30)),
      isSuccess: false,
      previousStatus: 'InReview',
      newStatus: 'AuditFlagged',
      ipAddress: '10.0.88.14 (AI Agent Orchestrator)',
      hash: '0xdf01938571029384756102938475610293847561029384756102938475610293',
    ),
    CivicAuditLog(
      id: 'aud-006',
      eventType: 'OPERATIONAL_MAINTENANCE',
      action: 'WORK_ORDER_DISPATCHED',
      performedBy: 'supervisor@civilanka.gov.lk',
      role: 'FieldMaintenanceSupervisor',
      details: 'Work Order WO-2026-080 dispatched to Southern Road Maintenance Crew (Lead: K. Perera). Priority: HIGH.',
      entityType: 'WorkOrder',
      entityId: 'WO-2026-080',
      timestamp: DateTime.now().subtract(const Duration(hours: 12, minutes: 05)),
      isSuccess: true,
      previousStatus: 'Assigned',
      newStatus: 'Dispatched',
      ipAddress: '172.16.4.19 (Field Mobile Gateway)',
      hash: '0x5501837492817462938475610293847561029384756102938475610293847561',
    ),
    CivicAuditLog(
      id: 'aud-007',
      eventType: 'DIRECTOR_EXECUTIVE',
      action: 'SYSTEM_POLICY_UPDATE',
      performedBy: 'director@civilanka.gov.lk',
      role: 'PublicWorksDirector',
      details: 'Mandatory photographic evidence policy updated. Minimum 2 geo-tagged images required for all maintenance completion sign-offs.',
      entityType: 'SecurityPolicy',
      entityId: 'POL-EVID-02',
      timestamp: DateTime.now().subtract(const Duration(days: 1, hours: 2)),
      isSuccess: true,
      previousStatus: 'Draft',
      newStatus: 'Enforced',
      ipAddress: '192.168.10.42 (Director Executive Portal)',
      hash: '0x7701837492817462938475610293847561029384756102938475610293847561',
    ),
  ];
}
