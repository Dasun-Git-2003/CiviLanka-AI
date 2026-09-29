class SafetyAnalysis {
  final String id;
  final String riskLevel;
  final double overallComplianceScore;
  final bool ppeDetected;
  final bool hazardCleared;
  final bool workZoneSecured;
  final String? complianceNotes;
  final String? recommendedAction;
  final DateTime createdAt;

  const SafetyAnalysis({
    required this.id,
    required this.riskLevel,
    required this.overallComplianceScore,
    required this.ppeDetected,
    required this.hazardCleared,
    required this.workZoneSecured,
    this.complianceNotes,
    this.recommendedAction,
    required this.createdAt,
  });

  factory SafetyAnalysis.fromJson(Map<String, dynamic> json) {
    return SafetyAnalysis(
      id: (json['id'] ?? '') as String,
      riskLevel: (json['riskLevel'] ?? 'ACCEPTABLE') as String,
      overallComplianceScore: json['overallComplianceScore'] != null
          ? (json['overallComplianceScore'] as num).toDouble()
          : 0.0,
      ppeDetected: json['ppeDetected'] as bool? ?? false,
      hazardCleared: json['hazardCleared'] as bool? ?? false,
      workZoneSecured: json['workZoneSecured'] as bool? ?? false,
      complianceNotes: json['complianceNotes'] as String?,
      recommendedAction: json['recommendedAction'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}

class MaintenanceRecord {
  final String id;
  final String workOrderId;
  final String? workOrderNumber;
  final String? workOrderTitle;
  final String? workOrderPriority;
  final String? workOrderSeverity;
  final String? assignedCrew;
  final String? location;
  final String? hazardCategory;
  final String? hazardTicket;

  final String? assetId;
  final String? assetName;
  final String? assetType;

  final String performedBy;
  final String maintenanceType;
  final String description;
  final String status;
  final double labourHours;
  final double actualCost;
  final double? estimatedCost;

  final String? materialsUsed;
  final String? equipmentUsed;
  final String? beforeImageUrl;
  final String? afterImageUrl;
  final String? workerNotes;
  final String? completionNotes;
  final String? verificationStatus;
  final String? rejectionReason;
  final String? supervisorNotes;

  final DateTime? workStartedAt;
  final DateTime? workCompletedAt;
  final DateTime createdAt;
  final SafetyAnalysis? latestSafetyAnalysis;

  const MaintenanceRecord({
    required this.id,
    required this.workOrderId,
    this.workOrderNumber,
    this.workOrderTitle,
    this.workOrderPriority,
    this.workOrderSeverity,
    this.assignedCrew,
    this.location,
    this.hazardCategory,
    this.hazardTicket,
    this.assetId,
    this.assetName,
    this.assetType,
    required this.performedBy,
    required this.maintenanceType,
    required this.description,
    required this.status,
    this.labourHours = 0.0,
    this.actualCost = 0.0,
    this.estimatedCost,
    this.materialsUsed,
    this.equipmentUsed,
    this.beforeImageUrl,
    this.afterImageUrl,
    this.workerNotes,
    this.completionNotes,
    this.verificationStatus,
    this.rejectionReason,
    this.supervisorNotes,
    this.workStartedAt,
    this.workCompletedAt,
    required this.createdAt,
    this.latestSafetyAnalysis,
  });

  factory MaintenanceRecord.fromJson(Map<String, dynamic> json) {
    return MaintenanceRecord(
      id: (json['id'] ?? '') as String,
      workOrderId: (json['workOrderId'] ?? '') as String,
      workOrderNumber: json['workOrderNumber'] as String?,
      workOrderTitle: json['workOrderTitle'] as String?,
      workOrderPriority: json['workOrderPriority'] as String?,
      workOrderSeverity: json['workOrderSeverity'] as String?,
      assignedCrew: json['assignedCrew'] as String?,
      location: json['location'] as String?,
      hazardCategory: json['hazardCategory'] as String?,
      hazardTicket: json['hazardTicket'] as String?,
      assetId: json['assetId'] as String?,
      assetName: json['assetName'] as String?,
      assetType: json['assetType'] as String?,
      performedBy: (json['performedBy'] ?? 'Field Worker') as String,
      maintenanceType: (json['maintenanceType'] ?? 'Corrective') as String,
      description: (json['description'] ?? '') as String,
      status: (json['status'] ?? 'PENDING') as String,
      labourHours: json['labourHours'] != null ? (json['labourHours'] as num).toDouble() : 0.0,
      actualCost: json['actualCost'] != null ? (json['actualCost'] as num).toDouble() : 0.0,
      estimatedCost: json['estimatedCost'] != null ? (json['estimatedCost'] as num).toDouble() : null,
      materialsUsed: json['materialsUsed'] as String?,
      equipmentUsed: json['equipmentUsed'] as String?,
      beforeImageUrl: json['beforeImageUrl'] as String?,
      afterImageUrl: json['afterImageUrl'] as String?,
      workerNotes: json['workerNotes'] as String?,
      completionNotes: json['completionNotes'] as String?,
      verificationStatus: json['verificationStatus'] as String?,
      rejectionReason: json['rejectionReason'] as String?,
      supervisorNotes: json['supervisorNotes'] as String?,
      workStartedAt: json['workStartedAt'] != null ? DateTime.tryParse(json['workStartedAt'] as String) : null,
      workCompletedAt: json['workCompletedAt'] != null ? DateTime.tryParse(json['workCompletedAt'] as String) : null,
      createdAt: json['createdAt'] != null 
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now() 
          : DateTime.now(),
      latestSafetyAnalysis: json['latestSafetyAnalysis'] != null
          ? SafetyAnalysis.fromJson(json['latestSafetyAnalysis'] as Map<String, dynamic>)
          : null,
    );
  }
}
