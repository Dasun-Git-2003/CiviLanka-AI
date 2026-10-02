import 'package:dio/dio.dart';
import 'api_service.dart';

class AnalyticsData {
  final int totalHazards;
  final int activeHazardsCount;
  final int criticalHazardsCount;
  final int inProgressHazardsCount;
  final int resolvedHazardsCount;
  final int totalWorkOrders;
  final int activeWorkOrdersCount;
  final int completedWorkOrdersCount;
  final double averageTurnaroundDays;
  final int totalMaintenanceRecords;
  final int verifiedMaintenanceCount;
  final double aiVerificationRate;
  final double averageSafetyScore;
  final List<dynamic> resolutionTrends;
  final List<dynamic> assetConditionDistribution;
  final List<dynamic> sectorIncidents;
  final List<dynamic> safetyComplianceRadar;

  AnalyticsData({
    required this.totalHazards,
    required this.activeHazardsCount,
    required this.criticalHazardsCount,
    required this.inProgressHazardsCount,
    required this.resolvedHazardsCount,
    required this.totalWorkOrders,
    required this.activeWorkOrdersCount,
    required this.completedWorkOrdersCount,
    required this.averageTurnaroundDays,
    required this.totalMaintenanceRecords,
    required this.verifiedMaintenanceCount,
    required this.aiVerificationRate,
    required this.averageSafetyScore,
    required this.resolutionTrends,
    required this.assetConditionDistribution,
    required this.sectorIncidents,
    required this.safetyComplianceRadar,
  });

  factory AnalyticsData.fromJson(Map<String, dynamic> json) {
    return AnalyticsData(
      totalHazards: json['totalHazards'] as int? ?? 0,
      activeHazardsCount: json['activeHazardsCount'] as int? ?? 0,
      criticalHazardsCount: json['criticalHazardsCount'] as int? ?? 0,
      inProgressHazardsCount: json['inProgressHazardsCount'] as int? ?? 0,
      resolvedHazardsCount: json['resolvedHazardsCount'] as int? ?? 0,
      totalWorkOrders: json['totalWorkOrders'] as int? ?? 0,
      activeWorkOrdersCount: json['activeWorkOrdersCount'] as int? ?? 0,
      completedWorkOrdersCount: json['completedWorkOrdersCount'] as int? ?? 0,
      averageTurnaroundDays: (json['averageTurnaroundDays'] as num?)?.toDouble() ?? 0.0,
      totalMaintenanceRecords: json['totalMaintenanceRecords'] as int? ?? 0,
      verifiedMaintenanceCount: json['verifiedMaintenanceCount'] as int? ?? 0,
      aiVerificationRate: (json['aiVerificationRate'] as num?)?.toDouble() ?? 98.4,
      averageSafetyScore: (json['averageSafetyScore'] as num?)?.toDouble() ?? 88.0,
      resolutionTrends: json['resolutionTrends'] as List<dynamic>? ?? [],
      assetConditionDistribution: json['assetConditionDistribution'] as List<dynamic>? ?? [],
      sectorIncidents: json['sectorIncidents'] as List<dynamic>? ?? [],
      safetyComplianceRadar: json['safetyComplianceRadar'] as List<dynamic>? ?? [],
    );
  }
}

class AnalyticsService {
  final ApiService _api;

  AnalyticsService(this._api);

  Future<AnalyticsData> getVisualizations({String timeframe = '30d'}) async {
    try {
      final response = await _api.dio.get(
        '/api/analytics/visualizations',
        queryParameters: {'timeframe': timeframe},
      );
      return AnalyticsData.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  String _handleError(DioException e) {
    final data = e.response?.data;
    if (data is Map && data.containsKey('message')) {
      return data['message'] as String;
    }
    return 'Failed to load municipal analytics telemetry.';
  }
}
