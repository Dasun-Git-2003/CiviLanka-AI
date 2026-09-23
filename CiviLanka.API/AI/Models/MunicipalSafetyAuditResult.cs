using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace CiviLanka.API.AI.Models
{
    public class MunicipalSafetyAuditInput
    {
        public Guid WorkOrderId { get; set; }
        public string WorkOrderNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public string Severity { get; set; } = string.Empty;
        public decimal EstimatedCost { get; set; }
        public decimal? ActualCost { get; set; }
        public string ApprovalStatus { get; set; } = string.Empty;
        public bool ApprovalRequired { get; set; }
        public string WorkOrderStatus { get; set; } = string.Empty;

        // Geolocation
        public double? WorkOrderLatitude { get; set; }
        public double? WorkOrderLongitude { get; set; }

        // Associated Maintenance Record
        public Guid? MaintenanceRecordId { get; set; }
        public string? PerformedBy { get; set; }
        public string? MaintenanceType { get; set; }
        public bool HasBeforeImage { get; set; }
        public string? BeforeImageUrl { get; set; }
        public bool HasAfterImage { get; set; }
        public string? AfterImageUrl { get; set; }
        public string? SafetyChecklist { get; set; }
        public string? VerificationStatus { get; set; }
        public double? ExecutionLatitude { get; set; }
        public double? ExecutionLongitude { get; set; }
        public double? GpsDistanceDeltaMeters { get; set; }
    }

    public class SafetyAuditViolation
    {
        [JsonPropertyName("ruleCode")]
        public string RuleCode { get; set; } = string.Empty; // e.g. SEC-PPE-01, FISC-DIR-01, EVID-IMG-01, GPS-TOL-01

        [JsonPropertyName("severity")]
        public string Severity { get; set; } = "HIGH"; // CRITICAL, HIGH, MEDIUM, LOW

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("remedialAction")]
        public string RemedialAction { get; set; } = string.Empty;
    }

    public class MunicipalSafetyAuditResult
    {
        /// <summary>
        /// Strict compliance outcome: PASS or FAILED.
        /// </summary>
        [JsonPropertyName("complianceStatus")]
        public string ComplianceStatus { get; set; } = "PASS"; // PASS, FAILED, ACTION_REQUIRED

        [JsonPropertyName("complianceScore")]
        public int ComplianceScore { get; set; } // 0 - 100

        [JsonPropertyName("safetyRulesPassed")]
        public bool SafetyRulesPassed { get; set; }

        [JsonPropertyName("budgetThresholdsApproved")]
        public bool BudgetThresholdsApproved { get; set; }

        [JsonPropertyName("completionEvidenceVerified")]
        public bool CompletionEvidenceVerified { get; set; }

        [JsonPropertyName("gpsVerificationPassed")]
        public bool GpsVerificationPassed { get; set; }

        [JsonPropertyName("violations")]
        public List<SafetyAuditViolation> Violations { get; set; } = new();

        [JsonPropertyName("auditFindings")]
        public string AuditFindings { get; set; } = string.Empty;

        [JsonPropertyName("recommendation")]
        public string Recommendation { get; set; } = string.Empty;

        [JsonPropertyName("requiresDirectorEscalation")]
        public bool RequiresDirectorEscalation { get; set; }

        [JsonPropertyName("confidence")]
        public double Confidence { get; set; } = 0.95;

        [JsonPropertyName("modelName")]
        public string ModelName { get; set; } = "gemini-2.5-flash";

        [JsonPropertyName("status")]
        public string Status { get; set; } = "AUDITED";

        [JsonPropertyName("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
