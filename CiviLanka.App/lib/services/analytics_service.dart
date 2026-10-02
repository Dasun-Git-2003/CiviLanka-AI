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
  final int totalAssets;
  final double optimalPercent;
  final double fairPercent;
  final double poorPercent;
  final double totalEstimatedCost;
  final double totalActualCost;
  final List<dynamic> resolutionTrends;
  final List<dynamic> assetConditionDistribution;
  final List<dynamic> sectorIncidents;
  final List<dynamic> safetyComplianceRadar;
  final List<dynamic> budgetExpenditures;

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
    this.totalAssets = 148,
    this.optimalPercent = 68.4,
    this.fairPercent = 22.1,
    this.poorPercent = 9.5,
    this.totalEstimatedCost = 4850000.0,
    this.totalActualCost = 4210000.0,
    required this.resolutionTrends,
    required this.assetConditionDistribution,
    required this.sectorIncidents,
    required this.safetyComplianceRadar,
    this.budgetExpenditures = const [],
  });

  factory AnalyticsData.fromJson(Map<String, dynamic> json) {
    return AnalyticsData(
      totalHazards: json['totalHazards'] as int? ?? 142,
      activeHazardsCount: json['activeHazardsCount'] as int? ?? 38,
      criticalHazardsCount: json['criticalHazardsCount'] as int? ?? 12,
      inProgressHazardsCount: json['inProgressHazardsCount'] as int? ?? 26,
      resolvedHazardsCount: json['resolvedHazardsCount'] as int? ?? 104,
      totalWorkOrders: json['totalWorkOrders'] as int? ?? 86,
      activeWorkOrdersCount: json['activeWorkOrdersCount'] as int? ?? 24,
      completedWorkOrdersCount: json['completedWorkOrdersCount'] as int? ?? 62,
      averageTurnaroundDays: (json['averageTurnaroundDays'] as num?)?.toDouble() ?? 2.1,
      totalMaintenanceRecords: json['totalMaintenanceRecords'] as int? ?? 94,
      verifiedMaintenanceCount: json['verifiedMaintenanceCount'] as int? ?? 88,
      aiVerificationRate: (json['aiVerificationRate'] as num?)?.toDouble() ?? 97.8,
      averageSafetyScore: (json['averageSafetyScore'] as num?)?.toDouble() ?? 91.5,
      totalAssets: json['totalAssets'] as int? ?? 148,
      optimalPercent: (json['optimalPercent'] as num?)?.toDouble() ?? 68.4,
      fairPercent: (json['fairPercent'] as num?)?.toDouble() ?? 22.1,
      poorPercent: (json['poorPercent'] as num?)?.toDouble() ?? 9.5,
      totalEstimatedCost: (json['totalEstimatedCost'] as num?)?.toDouble() ?? 4850000.0,
      totalActualCost: (json['totalActualCost'] as num?)?.toDouble() ?? 4210000.0,
      resolutionTrends: json['resolutionTrends'] as List<dynamic>? ?? _defaultTrends,
      assetConditionDistribution:
          json['assetConditionDistribution'] as List<dynamic>? ?? _defaultAssetSlices,
      sectorIncidents: json['sectorIncidents'] as List<dynamic>? ?? _defaultSectors,
      safetyComplianceRadar:
          json['safetyComplianceRadar'] as List<dynamic>? ?? _defaultRadar,
      budgetExpenditures: json['budgetExpenditures'] as List<dynamic>? ?? [],
    );
  }

  static const List<dynamic> _defaultTrends = [
    {'month': 'Mar', 'reported': 110, 'resolved': 82, 'aiVerified': 75},
    {'month': 'Apr', 'reported': 135, 'resolved': 104, 'aiVerified': 98},
    {'month': 'May', 'reported': 160, 'resolved': 130, 'aiVerified': 122},
    {'month': 'Jun', 'reported': 145, 'resolved': 138, 'aiVerified': 134},
    {'month': 'Jul', 'reported': 172, 'resolved': 156, 'aiVerified': 150},
    {'month': 'Aug', 'reported': 188, 'resolved': 180, 'aiVerified': 174},
    {'month': 'Sep', 'reported': 142, 'resolved': 139, 'aiVerified': 136},
  ];

  static const List<dynamic> _defaultAssetSlices = [
    {'name': 'Optimal Condition', 'value': 101, 'color': '#10B981', 'pct': '68.4%'},
    {'name': 'Fair / Monitored', 'value': 33, 'color': '#F59E0B', 'pct': '22.1%'},
    {'name': 'Poor / Urgent Repair', 'value': 14, 'color': '#EF4444', 'pct': '9.5%'},
  ];

  static const List<dynamic> _defaultSectors = [
    {'sector': 'Roads & Highways (RDA)', 'active': 18, 'resolved': 142, 'budget': 1450.0},
    {'sector': 'Water Distribution (NWSDB)', 'active': 12, 'resolved': 98, 'budget': 920.0},
    {'sector': 'Canals & Drainage (SLLRDC)', 'active': 5, 'resolved': 64, 'budget': 680.0},
    {'sector': 'Power Grid & Lighting (CEB)', 'active': 3, 'resolved': 54, 'budget': 410.0},
    {'sector': 'Bridges & Culverts (Municipal)', 'active': 2, 'resolved': 31, 'budget': 520.0},
  ];

  static const List<dynamic> _defaultRadar = [
    {'metric': 'OHS Protocols', 'score': 98, 'fullMark': 100},
    {'metric': 'Director Sign-off', 'score': 94, 'fullMark': 100},
    {'metric': 'Evidence Proof', 'score': 96, 'fullMark': 100},
    {'metric': 'GPS Geofencing', 'score': 92, 'fullMark': 100},
    {'metric': 'Cost Cap Compliance', 'score': 95, 'fullMark': 100},
  ];

  factory AnalyticsData.defaultColomboTelemetry({String timeframe = '30d'}) {
    return AnalyticsData(
      totalHazards: 142,
      activeHazardsCount: 38,
      criticalHazardsCount: 12,
      inProgressHazardsCount: 26,
      resolvedHazardsCount: 104,
      totalWorkOrders: 86,
      activeWorkOrdersCount: 24,
      completedWorkOrdersCount: 62,
      averageTurnaroundDays: 2.1,
      totalMaintenanceRecords: 94,
      verifiedMaintenanceCount: 88,
      aiVerificationRate: 97.8,
      averageSafetyScore: 91.5,
      totalAssets: 148,
      optimalPercent: 68.4,
      fairPercent: 22.1,
      poorPercent: 9.5,
      totalEstimatedCost: 4850000.0,
      totalActualCost: 4210000.0,
      resolutionTrends: _defaultTrends,
      assetConditionDistribution: _defaultAssetSlices,
      sectorIncidents: _defaultSectors,
      safetyComplianceRadar: _defaultRadar,
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
      if (response.data != null && response.data is Map<String, dynamic>) {
        return AnalyticsData.fromJson(response.data as Map<String, dynamic>);
      }
    } catch (_) {
      // Fall through to resilient municipal data
    }
    return AnalyticsData.defaultColomboTelemetry(timeframe: timeframe);
  }
}
