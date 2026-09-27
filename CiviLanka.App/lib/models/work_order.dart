class WorkOrder {
  final String id;
  final String workOrderNumber;
  final String? hazardId;
  final String? hazardTicket;
  final String? hazardCategory;
  final String? hazardDescription;
  final String? hazardSeverity;
  final String? hazardPriority;
  final double? hazardLatitude;
  final double? hazardLongitude;
  final String? hazardAddress;

  final String? assetId;
  final String? assetName;
  final String? assetType;
  final String? assetCondition;

  final String title;
  final String description;
  final String priority;
  final String? severity;

  final double? estimatedCost;
  final double? approvedBudget;
  final double? actualCost;
  final int? estimatedDurationHours;
  final int? recommendedCrewSize;

  final int? assignedContractorId;
  final String? assignedContractorName;
  final String? assignedCrew;
  final DateTime? scheduledDate;

  final String status;
  final String approvalStatus;
  final bool approvalRequired;
  final bool isArterialRoad;
  final String approvalReason;
  final String? notes;

  final String createdBy;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isCancelled;

  final List<WorkOrderItem> items;
  final CostEstimate? latestCostEstimate;
  final WorkOrderAIAnalysis? latestAIAnalysis;

  const WorkOrder({
    required this.id,
    required this.workOrderNumber,
    this.hazardId,
    this.hazardTicket,
    this.hazardCategory,
    this.hazardDescription,
    this.hazardSeverity,
    this.hazardPriority,
    this.hazardLatitude,
    this.hazardLongitude,
    this.hazardAddress,
    this.assetId,
    this.assetName,
    this.assetType,
    this.assetCondition,
    required this.title,
    required this.description,
    required this.priority,
    this.severity,
    this.estimatedCost,
    this.approvedBudget,
    this.actualCost,
    this.estimatedDurationHours,
    this.recommendedCrewSize,
    this.assignedContractorId,
    this.assignedContractorName,
    this.assignedCrew,
    this.scheduledDate,
    required this.status,
    required this.approvalStatus,
    required this.approvalRequired,
    required this.isArterialRoad,
    required this.approvalReason,
    this.notes,
    required this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    required this.isCancelled,
    this.items = const [],
    this.latestCostEstimate,
    this.latestAIAnalysis,
  });

  factory WorkOrder.fromJson(Map<String, dynamic> json) {
    return WorkOrder(
      id: json['id']?.toString() ?? '',
      workOrderNumber: json['workOrderNumber'] as String? ?? '',
      hazardId: json['hazardId']?.toString(),
      hazardTicket: json['hazardTicket'] as String?,
      hazardCategory: json['hazardCategory'] as String?,
      hazardDescription: json['hazardDescription'] as String?,
      hazardSeverity: json['hazardSeverity'] as String?,
      hazardPriority: json['hazardPriority'] as String?,
      hazardLatitude: (json['hazardLatitude'] as num?)?.toDouble(),
      hazardLongitude: (json['hazardLongitude'] as num?)?.toDouble(),
      hazardAddress: json['hazardAddress'] as String?,
      assetId: json['assetId'] as String?,
      assetName: json['assetName'] as String?,
      assetType: json['assetType'] as String?,
      assetCondition: json['assetCondition'] as String?,
      title: json['title'] as String? ?? '',
      description: json['description'] as String? ?? '',
      priority: json['priority'] as String? ?? 'NORMAL',
      severity: json['severity'] as String?,
      estimatedCost: (json['estimatedCost'] as num?)?.toDouble(),
      approvedBudget: (json['approvedBudget'] as num?)?.toDouble(),
      actualCost: (json['actualCost'] as num?)?.toDouble(),
      estimatedDurationHours: (json['estimatedDurationHours'] as num?)?.toInt(),
      recommendedCrewSize: (json['recommendedCrewSize'] as num?)?.toInt(),
      assignedContractorId: (json['assignedContractorId'] as num?)?.toInt(),
      assignedContractorName: json['assignedContractorName'] as String?,
      assignedCrew: json['assignedCrew'] as String?,
      scheduledDate: json['scheduledDate'] != null
          ? DateTime.tryParse(json['scheduledDate'] as String)
          : null,
      status: json['status'] as String? ?? 'AI_GENERATED',
      approvalStatus: json['approvalStatus'] as String? ?? 'NOT_REQUIRED',
      approvalRequired: json['approvalRequired'] as bool? ?? false,
      isArterialRoad: json['isArterialRoad'] as bool? ?? false,
      approvalReason: json['approvalReason'] as String? ?? 'None',
      notes: json['notes'] as String?,
      createdBy: json['createdBy'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? (DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now())
          : DateTime.now(),
      updatedAt: json['updatedAt'] != null
          ? (DateTime.tryParse(json['updatedAt'] as String) ?? DateTime.now())
          : DateTime.now(),
      isCancelled: json['isCancelled'] as bool? ?? false,
      items: (json['items'] as List<dynamic>?)
              ?.map((i) => WorkOrderItem.fromJson(i as Map<String, dynamic>))
              .toList() ??
          const [],
      latestCostEstimate: json['latestCostEstimate'] != null
          ? CostEstimate.fromJson(
              json['latestCostEstimate'] as Map<String, dynamic>)
          : null,
      latestAIAnalysis: json['latestAIAnalysis'] != null
          ? WorkOrderAIAnalysis.fromJson(
              json['latestAIAnalysis'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'workOrderNumber': workOrderNumber,
        'hazardId': hazardId,
        'hazardTicket': hazardTicket,
        'hazardCategory': hazardCategory,
        'hazardDescription': hazardDescription,
        'hazardSeverity': hazardSeverity,
        'hazardPriority': hazardPriority,
        'hazardLatitude': hazardLatitude,
        'hazardLongitude': hazardLongitude,
        'hazardAddress': hazardAddress,
        'assetId': assetId,
        'assetName': assetName,
        'assetType': assetType,
        'assetCondition': assetCondition,
        'title': title,
        'description': description,
        'priority': priority,
        'severity': severity,
        'estimatedCost': estimatedCost,
        'approvedBudget': approvedBudget,
        'actualCost': actualCost,
        'estimatedDurationHours': estimatedDurationHours,
        'recommendedCrewSize': recommendedCrewSize,
        'assignedContractorId': assignedContractorId,
        'assignedContractorName': assignedContractorName,
        'assignedCrew': assignedCrew,
        'scheduledDate': scheduledDate?.toIso8601String(),
        'status': status,
        'approvalStatus': approvalStatus,
        'approvalRequired': approvalRequired,
        'isArterialRoad': isArterialRoad,
        'approvalReason': approvalReason,
        'notes': notes,
        'createdBy': createdBy,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'isCancelled': isCancelled,
        'items': items.map((i) => i.toJson()).toList(),
        'latestCostEstimate': latestCostEstimate?.toJson(),
        'latestAIAnalysis': latestAIAnalysis?.toJson(),
      };
}

class WorkOrderItem {
  final String id;
  final String itemType;
  final String itemName;
  final double quantity;
  final String unit;
  final double estimatedUnitCost;
  final double estimatedTotalCost;

  const WorkOrderItem({
    required this.id,
    required this.itemType,
    required this.itemName,
    required this.quantity,
    required this.unit,
    required this.estimatedUnitCost,
    required this.estimatedTotalCost,
  });

  factory WorkOrderItem.fromJson(Map<String, dynamic> json) {
    return WorkOrderItem(
      id: json['id']?.toString() ?? '',
      itemType: json['itemType'] as String? ?? 'Material',
      itemName: json['itemName'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0.0,
      unit: json['unit'] as String? ?? '',
      estimatedUnitCost: (json['estimatedUnitCost'] as num?)?.toDouble() ?? 0.0,
      estimatedTotalCost:
          (json['estimatedTotalCost'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'itemType': itemType,
        'itemName': itemName,
        'quantity': quantity,
        'unit': unit,
        'estimatedUnitCost': estimatedUnitCost,
        'estimatedTotalCost': estimatedTotalCost,
      };
}

class CostEstimate {
  final String id;
  final double estimatedCost;
  final String currency;
  final double materialCost;
  final double labourCost;
  final double equipmentCost;
  final double estimatedLabourHours;
  final int recommendedCrewSize;
  final double estimatedDurationHours;
  final double confidence;
  final String reason;
  final String modelName;
  final DateTime createdAt;

  const CostEstimate({
    required this.id,
    required this.estimatedCost,
    this.currency = 'LKR',
    required this.materialCost,
    required this.labourCost,
    required this.equipmentCost,
    required this.estimatedLabourHours,
    required this.recommendedCrewSize,
    required this.estimatedDurationHours,
    required this.confidence,
    required this.reason,
    required this.modelName,
    required this.createdAt,
  });

  factory CostEstimate.fromJson(Map<String, dynamic> json) {
    return CostEstimate(
      id: json['id']?.toString() ?? '',
      estimatedCost: (json['estimatedCost'] as num?)?.toDouble() ?? 0.0,
      currency: json['currency'] as String? ?? 'LKR',
      materialCost: (json['materialCost'] as num?)?.toDouble() ?? 0.0,
      labourCost: (json['labourCost'] as num?)?.toDouble() ?? 0.0,
      equipmentCost: (json['equipmentCost'] as num?)?.toDouble() ?? 0.0,
      estimatedLabourHours:
          (json['estimatedLabourHours'] as num?)?.toDouble() ?? 0.0,
      recommendedCrewSize: (json['recommendedCrewSize'] as num?)?.toInt() ?? 1,
      estimatedDurationHours:
          (json['estimatedDurationHours'] as num?)?.toDouble() ?? 0.0,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      reason: json['reason'] as String? ?? '',
      modelName: json['modelName'] as String? ?? '',
      createdAt: json['createdAt'] != null
          ? (DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now())
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'estimatedCost': estimatedCost,
        'currency': currency,
        'materialCost': materialCost,
        'labourCost': labourCost,
        'equipmentCost': equipmentCost,
        'estimatedLabourHours': estimatedLabourHours,
        'recommendedCrewSize': recommendedCrewSize,
        'estimatedDurationHours': estimatedDurationHours,
        'confidence': confidence,
        'reason': reason,
        'modelName': modelName,
        'createdAt': createdAt.toIso8601String(),
      };
}

class WorkOrderAIAnalysis {
  final String id;
  final String agentName;
  final double estimatedCost;
  final String recommendation;
  final String reason;
  final double confidence;
  final DateTime createdAt;

  const WorkOrderAIAnalysis({
    required this.id,
    required this.agentName,
    required this.estimatedCost,
    required this.recommendation,
    required this.reason,
    required this.confidence,
    required this.createdAt,
  });

  factory WorkOrderAIAnalysis.fromJson(Map<String, dynamic> json) {
    return WorkOrderAIAnalysis(
      id: json['id']?.toString() ?? '',
      agentName: json['agentName'] as String? ?? '',
      estimatedCost: (json['estimatedCost'] as num?)?.toDouble() ?? 0.0,
      recommendation: json['recommendation'] as String? ?? '',
      reason: json['reason'] as String? ?? '',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      createdAt: json['createdAt'] != null
          ? (DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now())
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'agentName': agentName,
        'estimatedCost': estimatedCost,
        'recommendation': recommendation,
        'reason': reason,
        'confidence': confidence,
        'createdAt': createdAt.toIso8601String(),
      };
}
