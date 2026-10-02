class HazardAIAnalysis {
  final String? category;
  final String? severity;
  final double confidenceScore;
  final List<String> recommendedActions;
  final String? reasoning;
  final int estimatedTurnaroundDays;

  String get riskLevel => severity ?? 'Medium';
  String get suggestedPriority => severity ?? 'Normal';
  String get recommendedAction => recommendedActions.isNotEmpty ? recommendedActions.first : (reasoning ?? 'Proceed with scheduled municipal inspection');
  String get aiExplanation => reasoning ?? 'Automated municipal neural classification';

  HazardAIAnalysis({
    this.category,
    this.severity,
    this.confidenceScore = 0.0,
    this.recommendedActions = const [],
    this.reasoning,
    this.estimatedTurnaroundDays = 3,
  });

  factory HazardAIAnalysis.fromJson(Map<String, dynamic> json) {
    return HazardAIAnalysis(
      category: json['category'] as String? ?? json['suggestedCategory'] as String?,
      severity: json['severity'] as String? ?? json['suggestedSeverity'] as String?,
      confidenceScore: (json['confidenceScore'] as num?)?.toDouble() ??
          (json['confidence'] as num?)?.toDouble() ??
          0.85,
      recommendedActions: (json['recommendedActions'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      reasoning: json['reasoning'] as String? ?? json['description'] as String?,
      estimatedTurnaroundDays: json['estimatedTurnaroundDays'] as int? ?? 3,
    );
  }
}

class Hazard {
  final String id;
  final String title;
  final String description;
  final String category;
  final String severity;
  final String status;
  final double latitude;
  final double longitude;
  final String locationAddress;
  final String? imageUrl;
  final DateTime createdAt;
  final HazardAIAnalysis? aiAnalysis;

  Hazard({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.severity,
    required this.status,
    required this.latitude,
    required this.longitude,
    required this.locationAddress,
    this.imageUrl,
    required this.createdAt,
    this.aiAnalysis,
  });

  bool get isCritical => severity.toLowerCase() == 'critical';
  bool get isHigh => severity.toLowerCase() == 'high';
  bool get isResolved => status.toLowerCase() == 'resolved';
  bool get isInProgress =>
      status.toLowerCase() == 'inprogress' || status.toLowerCase() == 'workordercreated';
  String get ticketNumber => 'TKT-${id.length > 6 ? id.substring(0, 6).toUpperCase() : id.toUpperCase()}';
  String get priority => isCritical ? 'Critical' : (isHigh ? 'High' : severity);

  factory Hazard.fromJson(Map<String, dynamic> json) {
    return Hazard(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? ((json['ticketNumber'] != null) ? "${json['ticketNumber']} - ${json['category'] ?? ''}" : 'Municipal Hazard'),
      description: json['description'] as String? ?? '',
      category: json['category'] as String? ?? 'General',
      severity: json['severity'] as String? ?? 'Medium',
      status: json['status'] as String? ?? 'Reported',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 6.9271,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 79.8612,
      locationAddress: json['locationAddress'] as String? ??
          json['address'] as String? ??
          'Colombo, Sri Lanka',
      imageUrl: json['imageUrl'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      aiAnalysis: json['aiAnalysis'] != null && json['aiAnalysis'] is Map<String, dynamic>
          ? HazardAIAnalysis.fromJson(json['aiAnalysis'] as Map<String, dynamic>)
          : null,
    );
  }
}

class HazardCategory {
  final String id;
  final String name;
  final String icon;

  const HazardCategory({
    required this.id,
    required this.name,
    required this.icon,
  });
}

const List<HazardCategory> kHazardCategories = [
  HazardCategory(id: 'Pothole', name: 'Pothole & Road Damage', icon: 'traffic'),
  HazardCategory(id: 'DrainageBlockage', name: 'Drainage & Flooding', icon: 'water_damage'),
  HazardCategory(id: 'StreetlightFault', name: 'Streetlight & Electrical', icon: 'lightbulb'),
  HazardCategory(id: 'WaterPipeBurst', name: 'Water Pipe Burst', icon: 'water_drop'),
  HazardCategory(id: 'GarbageAccumulation', name: 'Garbage & Waste', icon: 'delete_outline'),
  HazardCategory(id: 'FallenTree', name: 'Fallen Tree / Obstruction', icon: 'park'),
];

class ColomboHotspot {
  final String name;
  final double lat;
  final double lng;
  final String description;

  const ColomboHotspot({
    required this.name,
    required this.lat,
    required this.lng,
    required this.description,
  });
}

const List<ColomboHotspot> kColomboHotspots = [
  ColomboHotspot(
    name: 'Colombo Fort (Zone 01)',
    lat: 6.9344,
    lng: 79.8428,
    description: 'Commercial & Financial Hub',
  ),
  ColomboHotspot(
    name: 'Galle Face Green',
    lat: 6.9271,
    lng: 79.8433,
    description: 'Coastal Promenade & Marine Drive',
  ),
  ColomboHotspot(
    name: 'Kollupitiya Junction (Zone 03)',
    lat: 6.9080,
    lng: 79.8510,
    description: 'High Density Transit Corridor',
  ),
  ColomboHotspot(
    name: 'Bambalapitiya (Zone 04)',
    lat: 6.8914,
    lng: 79.8557,
    description: 'Duplication & Galle Road corridor',
  ),
  ColomboHotspot(
    name: 'Borella Junction (Zone 08)',
    lat: 6.9147,
    lng: 79.8778,
    description: 'Central Health & Transit Intersection',
  ),
  ColomboHotspot(
    name: 'Maradana Railway Station (Zone 10)',
    lat: 6.9319,
    lng: 79.8660,
    description: 'Key Rail & Bus Interchange',
  ),
];

