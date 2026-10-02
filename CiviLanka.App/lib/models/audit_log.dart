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
    );
  }
}
