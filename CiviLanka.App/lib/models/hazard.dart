class Hazard {
  final String id;
  final String ticketNumber;
  final String citizenId;
  final String citizenName;
  final String category;
  final String description;
  final double? latitude;
  final double? longitude;
  final String? address;
  final String? imageUrl;
  final String status;
  final String? severity;
  final String? riskLevel;
  final String? priority;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isCancelled;
  final HazardAIAnalysis? latestAIAnalysis;

  const Hazard({
    required this.id,
    required this.ticketNumber,
    required this.citizenId,
    required this.citizenName,
    required this.category,
    required this.description,
    this.latitude,
    this.longitude,
    this.address,
    this.imageUrl,
    required this.status,
    this.severity,
    this.riskLevel,
    this.priority,
    required this.createdAt,
    required this.updatedAt,
    required this.isCancelled,
    this.latestAIAnalysis,
  });

  factory Hazard.fromJson(Map<String, dynamic> json) {
    return Hazard(
      id: json['id'] as String,
      ticketNumber: json['ticketNumber'] as String,
      citizenId: json['citizenId'] as String,
      citizenName: json['citizenName'] as String? ?? '',
      category: json['category'] as String,
      description: json['description'] as String,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      address: json['address'] as String?,
      imageUrl: json['imageUrl'] as String?,
      status: json['status'] as String,
      severity: json['severity'] as String?,
      riskLevel: json['riskLevel'] as String?,
      priority: json['priority'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      isCancelled: json['isCancelled'] as bool? ?? false,
      latestAIAnalysis: json['latestAIAnalysis'] != null
          ? HazardAIAnalysis.fromJson(
              json['latestAIAnalysis'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'ticketNumber': ticketNumber,
        'citizenId': citizenId,
        'citizenName': citizenName,
        'category': category,
        'description': description,
        'latitude': latitude,
        'longitude': longitude,
        'address': address,
        'imageUrl': imageUrl,
        'status': status,
        'severity': severity,
        'riskLevel': riskLevel,
        'priority': priority,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'isCancelled': isCancelled,
        'latestAIAnalysis': latestAIAnalysis?.toJson(),
      };
}

class HazardAIAnalysis {
  final String id;
  final String? category;
  final String severity;
  final String riskLevel;
  final String priority;
  final double confidence;
  final String reason;
  final String modelName;
  final DateTime createdAt;

  const HazardAIAnalysis({
    required this.id,
    this.category,
    required this.severity,
    required this.riskLevel,
    required this.priority,
    required this.confidence,
    required this.reason,
    required this.modelName,
    required this.createdAt,
  });

  factory HazardAIAnalysis.fromJson(Map<String, dynamic> json) {
    return HazardAIAnalysis(
      id: json['id'] as String,
      category: json['category'] as String?,
      severity: json['severity'] as String,
      riskLevel: json['riskLevel'] as String,
      priority: json['priority'] as String,
      confidence: (json['confidence'] as num).toDouble(),
      reason: json['reason'] as String,
      modelName: json['modelName'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'category': category,
        'severity': severity,
        'riskLevel': riskLevel,
        'priority': priority,
        'confidence': confidence,
        'reason': reason,
        'modelName': modelName,
        'createdAt': createdAt.toIso8601String(),
      };
}

// Valid hazard categories
class HazardCategory {
  static const pothole = 'Pothole';
  static const waterLeak = 'WaterLeak';
  static const brokenTrafficSignal = 'BrokenTrafficSignal';
  static const damagedRoad = 'DamagedRoad';
  static const fallenTree = 'FallenTree';
  static const drainageProblem = 'DrainageProblem';
  static const streetLightProblem = 'StreetLightProblem';
  static const other = 'Other';

  static const List<String> all = [
    pothole,
    waterLeak,
    brokenTrafficSignal,
    damagedRoad,
    fallenTree,
    drainageProblem,
    streetLightProblem,
    other,
  ];

  static String displayName(String category) {
    switch (category) {
      case pothole:
        return 'Pothole';
      case waterLeak:
        return 'Water Leak';
      case brokenTrafficSignal:
        return 'Broken Traffic Signal';
      case damagedRoad:
        return 'Damaged Road';
      case fallenTree:
        return 'Fallen Tree';
      case drainageProblem:
        return 'Drainage Problem';
      case streetLightProblem:
        return 'Street Light Problem';
      default:
        return 'Other';
    }
  }
}
