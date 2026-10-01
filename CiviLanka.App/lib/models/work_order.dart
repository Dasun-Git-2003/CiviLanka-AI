class WorkOrder {
  final String id;
  final String orderNumber;
  final String title;
  final String description;
  final String status;
  final String priority;
  final String? assignedContractor;
  final String? assignedContractorName;
  final double estimatedCost;
  final double? actualCost;
  final String? hazardId;
  final String? assetId;
  final DateTime createdAt;
  final DateTime? targetCompletionDate;

  WorkOrder({
    required this.id,
    required this.orderNumber,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    this.assignedContractor,
    this.assignedContractorName,
    required this.estimatedCost,
    this.actualCost,
    this.hazardId,
    this.assetId,
    required this.createdAt,
    this.targetCompletionDate,
  });

  bool get isCritical => priority.toLowerCase() == 'critical';
  bool get isInProgress => status.toLowerCase() == 'inprogress';
  bool get isAssigned => status.toLowerCase() == 'assigned';
  bool get isCompleted => status.toLowerCase() == 'completed';

  factory WorkOrder.fromJson(Map<String, dynamic> json) {
    return WorkOrder(
      id: json['id'] as String? ?? '',
      orderNumber: json['orderNumber'] as String? ?? 'WO-XXXX',
      title: json['title'] as String? ?? 'Field Work Order',
      description: json['description'] as String? ?? '',
      status: json['status'] as String? ?? 'Assigned',
      priority: json['priority'] as String? ?? 'Medium',
      assignedContractor: json['assignedContractorId'] as String?,
      assignedContractorName: json['contractorName'] as String? ?? json['assignedTo'] as String?,
      estimatedCost: (json['estimatedCost'] as num?)?.toDouble() ?? 0.0,
      actualCost: (json['actualCost'] as num?)?.toDouble(),
      hazardId: json['hazardId'] as String?,
      assetId: json['assetId'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      targetCompletionDate: json['targetCompletionDate'] != null
          ? DateTime.tryParse(json['targetCompletionDate'] as String)
          : null,
    );
  }
}
