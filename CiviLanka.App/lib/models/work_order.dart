// CiviLanka.App/lib/models/work_order.dart
// Member 4 Work Order & Operational Lifecycle Data Model

class WorkOrder {
  final int id;
  final int hazardId;
  final int? assetId;
  final String title;
  final String description;
  final String hazardCategory;
  final String priority;
  final double estimatedCost;
  final double actualCost;
  final bool isArterialRoad;
  final String roadName;
  final double locationLat;
  final double locationLng;
  final String? assignedCrew;
  final String? assignedWorker;
  final String status;
  final String? approvalStatus;
  final String? aiRecommendation;
  final String? beforePhoto;
  final String? afterPhoto;
  final List<String> materials;
  final String? completionNotes;
  final double? completionLat;
  final double? completionLng;

  WorkOrder({
    required this.id,
    required this.hazardId,
    this.assetId,
    required this.title,
    required this.description,
    required this.hazardCategory,
    required this.priority,
    required this.estimatedCost,
    required this.actualCost,
    required this.isArterialRoad,
    required this.roadName,
    required this.locationLat,
    required this.locationLng,
    this.assignedCrew,
    this.assignedWorker,
    required this.status,
    this.approvalStatus,
    this.aiRecommendation,
    this.beforePhoto,
    this.afterPhoto,
    this.materials = const [],
    this.completionNotes,
    this.completionLat,
    this.completionLng,
  });

  factory WorkOrder.fromJson(Map<String, dynamic> json) {
    return WorkOrder(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      hazardId: json['hazard_id'] is int
          ? json['hazard_id']
          : int.tryParse(json['hazard_id']?.toString() ?? '0') ?? 0,
      assetId: json['asset_id'] != null
          ? (json['asset_id'] is int
              ? json['asset_id']
              : int.tryParse(json['asset_id'].toString()))
          : null,
      title: json['title'] ?? 'Work Order',
      description: json['description'] ?? '',
      hazardCategory: json['hazard_category'] ?? 'GENERAL',
      priority: json['priority'] ?? 'MEDIUM',
      estimatedCost: (json['estimated_cost'] as num?)?.toDouble() ?? 0.0,
      actualCost: (json['actual_cost'] as num?)?.toDouble() ?? 0.0,
      isArterialRoad: json['is_arterial_road'] == true,
      roadName: json['road_name'] ?? 'Colombo Municipal Area',
      locationLat: (json['location_lat'] as num?)?.toDouble() ?? 6.9271,
      locationLng: (json['location_lng'] as num?)?.toDouble() ?? 79.8612,
      assignedCrew: json['assigned_crew'],
      assignedWorker: json['assigned_worker'],
      status: json['status'] ?? 'AI_PROPOSED',
      approvalStatus: json['approval_status'],
      aiRecommendation: json['ai_recommendation'],
      beforePhoto: json['before_photo'],
      afterPhoto: json['after_photo'],
      materials: (json['materials_json'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      completionNotes: json['completion_notes'],
      completionLat: (json['completion_lat'] as num?)?.toDouble(),
      completionLng: (json['completion_lng'] as num?)?.toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'hazard_id': hazardId,
      'asset_id': assetId,
      'title': title,
      'description': description,
      'hazard_category': hazardCategory,
      'priority': priority,
      'estimated_cost': estimatedCost,
      'actual_cost': actualCost,
      'is_arterial_road': isArterialRoad,
      'road_name': roadName,
      'location_lat': locationLat,
      'location_lng': locationLng,
      'assigned_crew': assignedCrew,
      'assigned_worker': assignedWorker,
      'status': status,
      'approval_status': approvalStatus,
      'ai_recommendation': aiRecommendation,
      'before_photo': beforePhoto,
      'after_photo': afterPhoto,
      'materials_json': materials,
      'completion_notes': completionNotes,
      'completion_lat': completionLat,
      'completion_lng': completionLng,
    };
  }
}
