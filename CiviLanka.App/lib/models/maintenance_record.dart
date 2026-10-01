class MaintenanceSafetyAnalysis {
  final int safetyScore;
  final String complianceStatus;
  final List<String> identifiedRisks;
  final List<String> requiredMitigations;
  final String? reasoning;
  final double confidenceScore;

  MaintenanceSafetyAnalysis({
    this.safetyScore = 90,
    this.complianceStatus = 'Compliant',
    this.identifiedRisks = const [],
    this.requiredMitigations = const [],
    this.reasoning,
    this.confidenceScore = 0.95,
  });

  factory MaintenanceSafetyAnalysis.fromJson(Map<String, dynamic> json) {
    return MaintenanceSafetyAnalysis(
      safetyScore: json['safetyScore'] as int? ?? 90,
      complianceStatus: json['complianceStatus'] as String? ?? 'Compliant',
      identifiedRisks: (json['identifiedRisks'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      requiredMitigations: (json['requiredMitigations'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      reasoning: json['reasoning'] as String?,
      confidenceScore: (json['confidenceScore'] as num?)?.toDouble() ?? 0.95,
    );
  }
}

class MaintenanceRecord {
  final String id;
  final String workOrderId;
  final String? workOrderTitle;
  final String? workOrderNumber;
  final String? assetId;
  final String? assetName;
  final String maintenanceType;
  final String description;
  final String status;
  final String? materialsUsed;
  final String? equipmentUsed;
  final double labourHours;
  final double actualCost;
  final String? beforeImageUrl;
  final String? afterImageUrl;
  final String? safetyChecklist;
  final String? workerNotes;
  final DateTime createdAt;
  final DateTime? workStartedAt;
  final DateTime? workCompletedAt;
  final MaintenanceSafetyAnalysis? aiSafetyAnalysis;

  MaintenanceRecord({
    required this.id,
    required this.workOrderId,
    this.workOrderTitle,
    this.workOrderNumber,
    this.assetId,
    this.assetName,
    required this.maintenanceType,
    required this.description,
    required this.status,
    this.materialsUsed,
    this.equipmentUsed,
    required this.labourHours,
    required this.actualCost,
    this.beforeImageUrl,
    this.afterImageUrl,
    this.safetyChecklist,
    this.workerNotes,
    required this.createdAt,
    this.workStartedAt,
    this.workCompletedAt,
    this.aiSafetyAnalysis,
  });

  bool get isAssignedOrScheduled =>
      status.toUpperCase() == 'SCHEDULED' || status.toUpperCase() == 'ASSIGNED';
  bool get isInProgress => status.toUpperCase() == 'INPROGRESS' || status.toUpperCase() == 'IN_PROGRESS';
  bool get isCompleted =>
      status.toUpperCase() == 'WORKCOMPLETED' ||
      status.toUpperCase() == 'COMPLETED' ||
      status.toUpperCase() == 'VERIFIED';
  bool get isVerified => status.toUpperCase() == 'VERIFIED';

  factory MaintenanceRecord.fromJson(Map<String, dynamic> json) {
    return MaintenanceRecord(
      id: json['id'] as String? ?? '',
      workOrderId: json['workOrderId'] as String? ?? '',
      workOrderTitle: json['workOrderTitle'] as String? ?? json['title'] as String?,
      workOrderNumber: json['workOrderNumber'] as String?,
      assetId: json['assetId'] as String?,
      assetName: json['assetName'] as String?,
      maintenanceType: json['maintenanceType'] as String? ?? 'Corrective',
      description: json['description'] as String? ?? '',
      status: json['status'] as String? ?? 'Scheduled',
      materialsUsed: json['materialsUsed'] as String?,
      equipmentUsed: json['equipmentUsed'] as String?,
      labourHours: (json['labourHours'] as num?)?.toDouble() ?? 0.0,
      actualCost: (json['actualCost'] as num?)?.toDouble() ?? 0.0,
      beforeImageUrl: json['beforeImageUrl'] as String?,
      afterImageUrl: json['afterImageUrl'] as String?,
      safetyChecklist: json['safetyChecklist'] as String?,
      workerNotes: json['workerNotes'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      workStartedAt: json['workStartedAt'] != null
          ? DateTime.tryParse(json['workStartedAt'] as String)
          : null,
      workCompletedAt: json['workCompletedAt'] != null
          ? DateTime.tryParse(json['workCompletedAt'] as String)
          : null,
      aiSafetyAnalysis: json['aiSafetyAnalysis'] != null &&
              json['aiSafetyAnalysis'] is Map<String, dynamic>
          ? MaintenanceSafetyAnalysis.fromJson(
              json['aiSafetyAnalysis'] as Map<String, dynamic>)
          : null,
    );
  }
}
