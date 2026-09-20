using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using CiviLanka.API.AI.Prompts;
using CiviLanka.API.Data;
using CiviLanka.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CiviLanka.API.AI.Agents
{
    public class MunicipalSafetyAuditAgent : IAIAgent<MunicipalSafetyAuditInput, MunicipalSafetyAuditResult>
    {
        private readonly IAIService _gemini;
        private readonly IAIResponseValidator _validator;
        private readonly AppDbContext _db;
        private readonly ILogger<MunicipalSafetyAuditAgent> _logger;

        public string AgentName => "CiviLanka-MunicipalSafetyAudit-v1";

        public MunicipalSafetyAuditAgent(
            IAIService gemini,
            IAIResponseValidator validator,
            AppDbContext db,
            ILogger<MunicipalSafetyAuditAgent> logger)
        {
            _gemini = gemini;
            _validator = validator;
            _db = db;
            _logger = logger;
        }

        public async Task<MunicipalSafetyAuditResult> ExecuteAsync(MunicipalSafetyAuditInput input)
        {
            ArgumentNullException.ThrowIfNull(input);

            if (!_gemini.IsConfigured)
            {
                _logger.LogWarning("Gemini is not configured. Running rule-based deterministic compliance audit for WO {Id}.", input.WorkOrderId);
                var fallback = BuildDeterministicAudit(input);
                await PersistAuditLogAsync(input, fallback);
                return fallback;
            }

            try
            {
                var systemPrompt = MunicipalSafetyAuditPrompt.SystemPrompt;
                var userPrompt = MunicipalSafetyAuditPrompt.BuildUserPrompt(input);

                _logger.LogInformation("Invoking Gemini for Municipal Safety & Audit evaluation on WO {Order}", input.WorkOrderNumber);

                var jsonResponse = await _gemini.GenerateStructuredJsonAsync(systemPrompt, userPrompt);
                if (string.IsNullOrWhiteSpace(jsonResponse))
                {
                    _logger.LogWarning("Gemini returned empty response for audit on WO {Id}. Using deterministic audit.", input.WorkOrderId);
                    var fallback = BuildDeterministicAudit(input);
                    await PersistAuditLogAsync(input, fallback);
                    return fallback;
                }

                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<MunicipalSafetyAuditResult>(jsonResponse, options);

                if (result == null)
                {
                    _logger.LogWarning("Failed to deserialize Gemini audit response for WO {Id}: {Raw}", input.WorkOrderId, jsonResponse);
                    var fallback = BuildDeterministicAudit(input);
                    await PersistAuditLogAsync(input, fallback);
                    return fallback;
                }

                _validator.ValidateMunicipalSafetyAudit(result, out _);
                result.ModelName = _gemini.ModelName;
                result.Status = "AUDITED";

                await PersistAuditLogAsync(input, result);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in MunicipalSafetyAuditAgent for WO {Id}", input.WorkOrderId);
                var fallback = BuildDeterministicAudit(input);
                await PersistAuditLogAsync(input, fallback);
                return fallback;
            }
        }

        private MunicipalSafetyAuditResult BuildDeterministicAudit(MunicipalSafetyAuditInput input)
        {
            var violations = new List<SafetyAuditViolation>();

            // 1. Budget threshold audit
            bool budgetApproved = true;
            if (input.EstimatedCost >= 500000 && !string.Equals(input.ApprovalStatus, "APPROVED", StringComparison.OrdinalIgnoreCase))
            {
                budgetApproved = false;
                violations.Add(new SafetyAuditViolation
                {
                    RuleCode = "FISC-DIR-01",
                    Severity = "CRITICAL",
                    Description = $"Work order cost (LKR {input.EstimatedCost:N0}) exceeds Director Approval threshold (LKR 500,000) without verified approval authorization.",
                    RemedialAction = "Obtain formal Public Works Director electronic sign-off before field execution or invoice processing."
                });
            }
            else if (input.EstimatedCost >= 100000 && string.Equals(input.ApprovalStatus, "REJECTED", StringComparison.OrdinalIgnoreCase))
            {
                budgetApproved = false;
                violations.Add(new SafetyAuditViolation
                {
                    RuleCode = "FISC-SUP-01",
                    Severity = "HIGH",
                    Description = "Work order approval was explicitly rejected by maintenance supervisor.",
                    RemedialAction = "Review and resolve supervisor objections prior to proceeding."
                });
            }

            // 2. Photographic evidence audit
            bool evidenceVerified = true;
            if (string.Equals(input.WorkOrderStatus, "COMPLETED", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(input.WorkOrderStatus, "VERIFIED", StringComparison.OrdinalIgnoreCase))
            {
                if (!input.HasBeforeImage)
                {
                    evidenceVerified = false;
                    violations.Add(new SafetyAuditViolation
                    {
                        RuleCode = "EVID-IMG-01",
                        Severity = "HIGH",
                        Description = "Missing mandatory baseline (before-repair) photographic evidence.",
                        RemedialAction = "Field crew must upload dated initial site condition photo."
                    });
                }
                if (!input.HasAfterImage)
                {
                    evidenceVerified = false;
                    violations.Add(new SafetyAuditViolation
                    {
                        RuleCode = "EVID-IMG-02",
                        Severity = "CRITICAL",
                        Description = "Missing mandatory completed work (after-repair) photographic proof.",
                        RemedialAction = "Contractor must upload clear daytime photo of completed infrastructure repair."
                    });
                }
            }

            // 3. Geodetic GPS distance audit (150m tolerance)
            bool gpsPassed = true;
            if (input.GpsDistanceDeltaMeters.HasValue && input.GpsDistanceDeltaMeters.Value > 150)
            {
                gpsPassed = false;
                violations.Add(new SafetyAuditViolation
                {
                    RuleCode = "GPS-TOL-01",
                    Severity = "HIGH",
                    Description = $"GPS displacement delta ({input.GpsDistanceDeltaMeters.Value:F0}m) exceeds the 150m municipal tolerance threshold.",
                    RemedialAction = "Supervisor must physically confirm contractor repaired the correct asset coordinates."
                });
            }

            // 4. Safety rules
            bool safetyPassed = true;
            if ((input.Severity == "CRITICAL" || input.Priority == "URGENT") && string.IsNullOrWhiteSpace(input.SafetyChecklist))
            {
                safetyPassed = false;
                violations.Add(new SafetyAuditViolation
                {
                    RuleCode = "SEC-CHK-01",
                    Severity = "HIGH",
                    Description = "Critical priority emergency repair executed without digital safety checklist submission.",
                    RemedialAction = "Site foreman must submit signed safety protocols checklist."
                });
            }

            bool passed = violations.Count == 0;
            int score = Math.Max(10, 100 - (violations.Count * 25));

            return new MunicipalSafetyAuditResult
            {
                ComplianceStatus = passed ? "PASS" : "FAILED",
                ComplianceScore = score,
                SafetyRulesPassed = safetyPassed,
                BudgetThresholdsApproved = budgetApproved,
                CompletionEvidenceVerified = evidenceVerified,
                GpsVerificationPassed = gpsPassed,
                Violations = violations,
                AuditFindings = passed
                    ? $"All municipal compliance rules verified successfully for WO {input.WorkOrderNumber}. Budget authorizations, safety protocols, and evidence criteria satisfied."
                    : $"Audit failed with {violations.Count} compliance violation(s) identified across safety, fiscal governance, and evidence standards.",
                Recommendation = passed
                    ? "Authorize municipal work order closure and contractor payment disbursement."
                    : "Remedial corrective actions required before work order can be certified.",
                RequiresDirectorEscalation = !budgetApproved || violations.Any(v => v.Severity == "CRITICAL"),
                Confidence = 0.95,
                ModelName = _gemini.ModelName,
                Status = "AUDITED"
            };
        }

        private async Task PersistAuditLogAsync(MunicipalSafetyAuditInput input, MunicipalSafetyAuditResult result)
        {
            try
            {
                if (input.MaintenanceRecordId.HasValue)
                {
                    var auditLog = new MaintenanceAuditLog
                    {
                        MaintenanceRecordId = input.MaintenanceRecordId.Value,
                        UserId = AgentName,
                        Action = $"AI Municipal Safety Audit: {result.ComplianceStatus}",
                        EntityType = "WorkOrder",
                        EntityId = input.WorkOrderId.ToString(),
                        Timestamp = DateTime.UtcNow,
                        Description = $"Score: {result.ComplianceScore}/100 | Violations: {result.Violations.Count} | Findings: {result.AuditFindings}"
                    };
                    _db.MaintenanceAuditLogs.Add(auditLog);
                    await _db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist audit log entry for WO {Id}", input.WorkOrderId);
            }
        }
    }
}
