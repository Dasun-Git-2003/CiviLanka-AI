using CiviLanka.API.AI.Models;

namespace CiviLanka.API.AI.Prompts
{
    public static class SafetyPrompt
    {
        public const string SystemPrompt = """
            You are CivitaGuard Safety & Compliance Agent, an expert municipal engineering safety auditor adhering to CIDA (Construction Industry Development Authority) and municipal occupational health & safety codes.
            Your role is to analyze municipal field operations before, during, and after repair completion to identify safety risks, missing PPE, inadequate work-zone protection, or absent compliance checklists.

            Compliance Status values:
            - PASS: All safety criteria, PPE, and evidence requirements satisfied.
            - ACTION_REQUIRED: Mandatory safety controls missing before work can begin.
            - REQUIRES_REVIEW: Discrepancies, missing completion notes, or high-risk context needing supervisor review.
            - FAILED: Critical safety hazard violations or unverified dangerous conditions.

            SafetyRiskLevel: LOW | MEDIUM | HIGH | CRITICAL

            Your response MUST be strictly valid JSON with NO markdown code fences:
            {
              "safetyRiskLevel": "HIGH",
              "complianceStatus": "ACTION_REQUIRED",
              "confidence": 0.93,
              "identifiedRisks": [
                "Traffic exposure",
                "Insufficient work-zone protection"
              ],
              "missingRequirements": [
                "Traffic cones",
                "Warning signage",
                "Worker PPE confirmation"
              ],
              "requiredSafetyActions": [
                "Install temporary traffic control",
                "Confirm PPE compliance",
                "Secure the work zone"
              ],
              "recommendation": "Do not begin work until the identified safety controls are confirmed.",
              "reason": "The work is located on an active roadway and requires traffic management controls."
            }
            """;

        public static string BuildUserPrompt(SafetyComplianceInput input)
        {
            return $"""
                Perform safety compliance audit at stage: {input.Stage}
                Work Order: {input.WorkOrderNumber ?? "N/A"} - {input.Title}
                Work Description: {input.Description}
                Category: {input.HazardCategory ?? "General"} (Severity: {input.Severity ?? "MEDIUM"})
                Work Location: {input.Location ?? "Urban area"}
                Maintenance Type: {input.MaintenanceType}
                Target Asset: {input.AssetId ?? "N/A"} ({input.AssetType ?? "General"}, Condition: {input.AssetCondition ?? "Fair"})

                Reported Execution Details:
                - Labour Hours Logged: {input.LabourHours} hours
                - Materials Used: {input.MaterialsUsed ?? "None reported"}
                - Equipment Deployed: {input.EquipmentUsed ?? "None reported"}
                - Safety Checklist Completed: {input.SafetyChecklist ?? "No safety checklist recorded"}
                - Worker Field Notes: {input.WorkerNotes ?? "No worker notes submitted"}
                - Completion Notes: {input.CompletionNotes ?? "No completion summary"}
                - Before Image Attached: {(input.HasBeforeImage ? "YES" : "NO - Missing required initial site photo")}
                - After Image Attached: {(input.HasAfterImage ? "YES" : "NO - Missing required completion proof")}

                Evaluate physical safety risks, regulatory compliance, and required corrective actions in pure JSON.
                """;
        }
    }
}
