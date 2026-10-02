class AIDashboardMetrics {
  final int totalAnalyses;
  final int highRiskCount;
  final int pendingReviewCount;
  final double averageConfidence;
  final String mostCommonHazard;
  final String highestRiskArea;
  final String mostFrequentMaintenanceType;
  final List<AIActivityItem> recentActivities;

  AIDashboardMetrics({
    required this.totalAnalyses,
    required this.highRiskCount,
    required this.pendingReviewCount,
    required this.averageConfidence,
    required this.mostCommonHazard,
    required this.highestRiskArea,
    required this.mostFrequentMaintenanceType,
    required this.recentActivities,
  });

  factory AIDashboardMetrics.fromJson(Map<String, dynamic> json) {
    final activities = (json['recentActivities'] as List<dynamic>?)
            ?.map((e) => AIActivityItem.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [];

    return AIDashboardMetrics(
      totalAnalyses: (json['totalAnalyses'] as num?)?.toInt() ?? 0,
      highRiskCount: (json['highRiskCount'] as num?)?.toInt() ?? 0,
      pendingReviewCount: (json['pendingReviewCount'] as num?)?.toInt() ?? 0,
      averageConfidence: (json['averageConfidence'] as num?)?.toDouble() ?? 0.0,
      mostCommonHazard: json['mostCommonHazard'] as String? ?? 'Road Damage',
      highestRiskArea: json['highestRiskArea'] as String? ?? 'Colombo Central',
      mostFrequentMaintenanceType:
          json['mostFrequentMaintenanceType'] as String? ?? 'Road Repair',
      recentActivities: activities,
    );
  }
}

class AIActivityItem {
  final String id;
  final String title;
  final String type; // Hazard Classification, Cost Estimation, Safety Analysis
  final String referenceNumber;
  final double confidence;
  final DateTime timestamp;
  final String? summary;

  AIActivityItem({
    required this.id,
    required this.title,
    required this.type,
    required this.referenceNumber,
    required this.confidence,
    required this.timestamp,
    this.summary,
  });

  factory AIActivityItem.fromJson(Map<String, dynamic> json) {
    return AIActivityItem(
      id: json['id']?.toString() ?? '',
      title: json['title'] as String? ?? 'AI Analysis',
      type: json['type'] as String? ?? 'Classification',
      referenceNumber: json['referenceNumber'] as String? ?? 'N/A',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.9,
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
          : DateTime.now(),
      summary: json['summary'] as String?,
    );
  }
}
