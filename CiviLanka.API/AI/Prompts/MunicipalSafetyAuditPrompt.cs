using System;
using System.Text;
using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Prompts
{
    public static class MunicipalSafetyAuditPrompt
    {
        public const string SystemPrompt = """
            You are CiviLanka Municipal Safety & Audit Agent, an uncompromising municipal compliance auditor.
            Your role is to rigorously inspect completed or active work orders against Sri Lankan municipal regulations:
            1. Safety & Priority Rules: Confirm whether high-severity work orders had appropriate physical risk mitigations, safety checklist sign-offs, and field safety protocols.
            2. Fiscal Budget Governance:
               - Standard cost (< LKR 100,000): standard approval.
               - Supervisor threshold (>= LKR 100,000): mandatory Supervisor approval signature.
               - Director threshold (>= LKR 500,000): mandatory Public Works Director authorization.
               - An unapproved expenditure exceeding thresholds MUST cause a FAILED audit.
            3. Photographic Evidence & GPS Verification:
               - Before photo AND After photo are strictly required for completion verification.
               - GPS coordinates of execution must be within 150m of reported hazard coordinates.
               - Discrepancies > 150m without recorded field explanation MUST be flagged.
            4. Produce strict compliance status: PASS or FAILED (or ACTION_REQUIRED if non-critical evidence is missing but fixable).

            Your response MUST be strictly valid JSON matching this schema with NO markdown code fences and NO preamble:
            {
              "complianceStatus": "PASS",
              "complianceScore": 92,
              "safetyRulesPassed": true,
              "budgetThresholdsApproved": true,
              "completionEvidenceVerified": true,
              "gpsVerificationPassed": true,
              "violations": [
                {
                  "ruleCode": "EVID-IMG-02",
                  "severity": "HIGH",
                  "description": "Missing photographic proof of asphalt compaction post-repair.",
                  "remedialAction": "Contractor must upload clear daytime photo of sealed pavement before invoice approval."
                }
              ],
              "auditFindings": "Thorough audit of work order completed. Budget of LKR 120,000 was duly approved by Field Maintenance Supervisor. GPS coordinates align within 18m of reported pothole.",
              "recommendation": "Authorize payment upon contractor remediation of photo upload.",
              "requiresDirectorEscalation": false,
              "confidence": 0.94
            }
            """;

        public static string BuildUserPrompt(MunicipalSafetyAuditInput input)
        {
            var sb = new StringBuilder();
            sb.AppendLine("Conduct a municipal compliance audit for this work order:");
            sb.AppendLine($"Work Order Number: {input.WorkOrderNumber} (ID: {input.WorkOrderId})");
            sb.AppendLine($"Title: {input.Title}");
            sb.AppendLine($"Priority: {input.Priority} | Severity: {input.Severity} | Status: {input.WorkOrderStatus}");
            sb.AppendLine($"Estimated Cost: LKR {input.EstimatedCost:N2}");
            if (input.ActualCost.HasValue)
            {
                sb.AppendLine($"Actual Incurred Cost: LKR {input.ActualCost.Value:N2}");
            }
            sb.AppendLine($"Approval Status: {input.ApprovalStatus} (Approval Required: {input.ApprovalRequired})");

            sb.AppendLine();
            sb.AppendLine("=== GEODETIC INTEGRITY & GPS TELEMETRY ===");
            sb.AppendLine($"Reported Hazard Location: Lat {input.WorkOrderLatitude?.ToString("F5") ?? "N/A"}, Lng {input.WorkOrderLongitude?.ToString("F5") ?? "N/A"}");
            sb.AppendLine($"Contractor Execution Location: Lat {input.ExecutionLatitude?.ToString("F5") ?? "N/A"}, Lng {input.ExecutionLongitude?.ToString("F5") ?? "N/A"}");
            if (input.GpsDistanceDeltaMeters.HasValue)
            {
                sb.AppendLine($"GPS Displacement Delta: {input.GpsDistanceDeltaMeters.Value:F1} meters (Permitted tolerance: 150m)");
            }
            else
            {
                sb.AppendLine("GPS Displacement Delta: Telemetry coordinates missing or incomplete.");
            }

            sb.AppendLine();
            sb.AppendLine("=== EVIDENCE & VERIFICATION DATA ===");
            sb.AppendLine($"Has Before Photo: {input.HasBeforeImage} ({input.BeforeImageUrl ?? "None"})");
            sb.AppendLine($"Has After Photo: {input.HasAfterImage} ({input.AfterImageUrl ?? "None"})");
            sb.AppendLine($"Safety Checklist Submission: {(string.IsNullOrWhiteSpace(input.SafetyChecklist) ? "None submitted" : input.SafetyChecklist)}");
            sb.AppendLine($"Current Verification Status: {input.VerificationStatus ?? "NOT_SUBMITTED"}");
            sb.AppendLine($"Performed By: {input.PerformedBy ?? "Unassigned"}");

            sb.AppendLine();
            sb.AppendLine("Audit all rules, budget caps, safety evidence, and GPS tolerance. Output PASS or FAILED with detailed violation breakdown.");
            return sb.ToString();
        }
    }
}
