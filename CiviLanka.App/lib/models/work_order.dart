class WorkOrder {
  final String id;
  final String workOrderNumber;
  final String? hazardId;
  final String? assetId;
  final String title;
  final String description;
  final String priority;
  final String? severity;
  final String status;
  final double? estimatedCost;
  final double? actualCost;
  final int? estimatedDurationHours;
  final String? assignedToUserId;
  final String? assignedWorkerName;
  final String? contractorName;
  final bool requiresDirectorApproval;
  final DateTime? targetCompletionDate;
  final DateTime createdAt;

  const WorkOrder({
    required this.id,
    required this.workOrderNumber,
    this.hazardId,
    this.assetId,
    required this.title,
    required this.description,
    required this.priority,
    this.severity,
    required this.status,
    this.estimatedCost,
    this.actualCost,
    this.estimatedDurationHours,
    this.assignedToUserId,
    this.assignedWorkerName,
    this.contractorName,
    this.requiresDirectorApproval = false,
    this.targetCompletionDate,
    required this.createdAt,
  });

  factory WorkOrder.fromJson(Map<String, dynamic> json) {
    return WorkOrder(
      id: (json['id'] ?? '') as String,
      workOrderNumber: (json['workOrderNumber'] ?? 'WO-PENDING') as String,
      hazardId: json['hazardId'] as String?,
      assetId: json['assetId'] as String?,
      title: (json['title'] ?? 'Untitled Work Order') as String,
      description: (json['description'] ?? '') as String,
      priority: (json['priority'] ?? 'NORMAL') as String,
      severity: json['severity'] as String?,
      status: (json['status'] ?? 'PENDING') as String,
      estimatedCost: json['estimatedCost'] != null ? (json['estimatedCost'] as num).toDouble() : null,
      actualCost: json['actualCost'] != null ? (json['actualCost'] as num).toDouble() : null,
      estimatedDurationHours: json['estimatedDurationHours'] as int?,
      assignedToUserId: json['assignedToUserId'] as String?,
      assignedWorkerName: json['assignedWorkerName'] as String?,
      contractorName: json['contractorName'] as String?,
      requiresDirectorApproval: json['requiresDirectorApproval'] as bool? ?? false,
      targetCompletionDate: json['targetCompletionDate'] != null 
          ? DateTime.tryParse(json['targetCompletionDate'] as String) 
          : null,
      createdAt: json['createdAt'] != null 
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now() 
          : DateTime.now(),
    );
  }

  String get orderNumber => workOrderNumber;
  String? get assignedCrew => assignedWorkerName ?? contractorName;
  String? get hazardTicketNumber => hazardId;
}
