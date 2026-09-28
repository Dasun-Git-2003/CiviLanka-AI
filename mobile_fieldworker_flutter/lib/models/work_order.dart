class WorkOrder {
  final int id;
  final int hazardId;
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
  final String? aiRecommendation;
  final String? beforePhoto;
  final String? afterPhoto;
  final List<String> materials;
  final String? completionNotes;

  WorkOrder({
    required this.id,
    required this.hazardId,
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
    this.aiRecommendation,
    this.beforePhoto,
    this.afterPhoto,
    this.materials = const [],
    this.completionNotes,
  });

  factory WorkOrder.fromJson(Map<String, dynamic> json) {
    return WorkOrder(
      id: json['id'] is int ? json['id'] : int.parse(json['id'].toString()),
      hazardId: json['hazard_id'] is int ? json['hazard_id'] : int.parse(json['hazard_id'].toString()),
      title: json['title'] ?? 'Work Order',
      description: json['description'] ?? '',
      hazardCategory: json['hazard_category'] ?? 'GENERAL',
      priority: json['priority'] ?? 'MEDIUM',
      estimatedCost: (json['estimated_cost'] as num?)?.toDouble() ?? 0.0,
      actualCost: (json['actual_cost'] as num?)?.toDouble() ?? 0.0,
      isArterialRoad: json['is_arterial_road'] == true,
      roadName: json['road_name'] ?? 'Unknown Road',
      locationLat: (json['location_lat'] as num?)?.toDouble() ?? 0.0,
      locationLng: (json['location_lng'] as num?)?.toDouble() ?? 0.0,
      assignedCrew: json['assigned_crew'],
      assignedWorker: json['assigned_worker'],
      status: json['status'] ?? 'AI_PROPOSED',
      aiRecommendation: json['ai_recommendation'],
      beforePhoto: json['before_photo'],
      afterPhoto: json['after_photo'],
      materials: (json['materials_json'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      completionNotes: json['completion_notes'],
    );
  }
}
