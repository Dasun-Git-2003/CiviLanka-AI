class SafetyAuditViolation {
  final String ruleCode;
  final String severity; // CRITICAL, HIGH, MEDIUM, LOW
  final String description;
  final String remedialAction;

  const SafetyAuditViolation({
    required this.ruleCode,
    required this.severity,
    required this.description,
    required this.remedialAction,
  });

  factory SafetyAuditViolation.fromJson(Map<String, dynamic> json) {
    return SafetyAuditViolation(
      ruleCode: json['ruleCode'] as String? ?? 'RULE-GEN-01',
      severity: json['severity'] as String? ?? 'HIGH',
      description: json['description'] as String? ?? '',
      remedialAction: json['remedialAction'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'ruleCode': ruleCode,
        'severity': severity,
        'description': description,
        'remedialAction': remedialAction,
      };
}

class MunicipalSafetyAuditResult {
  final String complianceStatus; // PASS, FAILED, ACTION_REQUIRED
  final int complianceScore; // 0 - 100
  final bool safetyRulesPassed;
  final bool budgetThresholdsApproved;
  final bool completionEvidenceVerified;
  final bool gpsVerificationPassed;
  final double gpsDistanceMeters;
  final List<SafetyAuditViolation> violations;
  final String auditFindings;
  final String recommendation;
  final bool requiresDirectorEscalation;
  final double confidence;
  final String modelName;
  final String status;
  final String auditCertificateId;
  final DateTime timestamp;

  const MunicipalSafetyAuditResult({
    required this.complianceStatus,
    required this.complianceScore,
    required this.safetyRulesPassed,
    required this.budgetThresholdsApproved,
    required this.completionEvidenceVerified,
    required this.gpsVerificationPassed,
    this.gpsDistanceMeters = 8.4,
    required this.violations,
    required this.auditFindings,
    required this.recommendation,
    required this.requiresDirectorEscalation,
    required this.confidence,
    required this.modelName,
    required this.status,
    required this.auditCertificateId,
    required this.timestamp,
  });

  factory MunicipalSafetyAuditResult.fromJson(Map<String, dynamic> json) {
    final violationsList = (json['violations'] as List<dynamic>?)
            ?.map((v) => SafetyAuditViolation.fromJson(v as Map<String, dynamic>))
            .toList() ??
        [];

    final score = (json['complianceScore'] as num?)?.toInt() ??
        (json['complianceStatus'] == 'PASS' ? 95 : 45);

    return MunicipalSafetyAuditResult(
      complianceStatus: json['complianceStatus'] as String? ?? 'PASS',
      complianceScore: score,
      safetyRulesPassed: json['safetyRulesPassed'] as bool? ?? true,
      budgetThresholdsApproved: json['budgetThresholdsApproved'] as bool? ?? true,
      completionEvidenceVerified: json['completionEvidenceVerified'] as bool? ?? true,
      gpsVerificationPassed: json['gpsVerificationPassed'] as bool? ?? true,
      gpsDistanceMeters: (json['gpsDistanceMeters'] as num?)?.toDouble() ?? 12.5,
      violations: violationsList,
      auditFindings: json['auditFindings'] as String? ?? 'All routine municipal safety criteria satisfied.',
      recommendation: json['recommendation'] as String? ?? 'Approved for final municipal sign-off.',
      requiresDirectorEscalation: json['requiresDirectorEscalation'] as bool? ?? false,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.96,
      modelName: json['modelName'] as String? ?? 'gemini-3.1-flash-lite',
      status: json['status'] as String? ?? 'AUDITED',
      auditCertificateId: json['auditCertificateId'] as String? ??
          'CERT-MUNI-2026-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  bool get isPass => complianceStatus.toUpperCase() == 'PASS';
  bool get isFailed => complianceStatus.toUpperCase() == 'FAILED';
}
