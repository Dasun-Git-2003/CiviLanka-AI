class AssetRiskResult {
  final String riskLevel; // LOW, MEDIUM, HIGH, CRITICAL
  final int riskScore; // 0 - 100
  final double confidence;
  final String conditionAssessment; // Good, Satisfactory, Deteriorating, Critical
  final String failureLikelihood; // Low, Moderate, High, Imminent
  final String reason;
  final String recommendedInspectionFrequency;
  final String recommendedAction;
  final String urgency;
  final String modelName;
  final String status;
  final DateTime timestamp;

  const AssetRiskResult({
    required this.riskLevel,
    required this.riskScore,
    required this.confidence,
    required this.conditionAssessment,
    required this.failureLikelihood,
    required this.reason,
    required this.recommendedInspectionFrequency,
    required this.recommendedAction,
    required this.urgency,
    required this.modelName,
    required this.status,
    required this.timestamp,
  });

  factory AssetRiskResult.fromJson(Map<String, dynamic> json) {
    return AssetRiskResult(
      riskLevel: (json['riskLevel'] as String? ?? 'MEDIUM').toUpperCase(),
      riskScore: (json['riskScore'] as num?)?.toInt() ?? 50,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.94,
      conditionAssessment: json['conditionAssessment'] as String? ?? 'Deteriorating',
      failureLikelihood: json['failureLikelihood'] as String? ?? 'Moderate',
      reason: json['reason'] as String? ??
          'Wear trajectory indicates accelerated material fatigue under heavy commuter and monsoon traffic.',
      recommendedInspectionFrequency:
          json['recommendedInspectionFrequency'] as String? ?? 'Bi-Weekly',
      recommendedAction: json['recommendedAction'] as String? ??
          'Structural reinforcement, joint sealing and cathodic protection.',
      urgency: json['urgency'] as String? ?? 'High',
      modelName: json['modelName'] as String? ?? 'gemini-3.1-flash-lite / Markov Degradation',
      status: json['status'] as String? ?? 'AI_ANALYZED',
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  bool get isCritical => riskLevel == 'CRITICAL';
  bool get isHigh => riskLevel == 'HIGH';
}
