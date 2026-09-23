using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using CiviLanka.API.Data;
using CiviLanka.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CiviLanka.API.AI.Services
{
    public class AIAgentOrchestrator : IAIAgentOrchestrator
    {
        private readonly IAIContextBuilder _contextBuilder;
        private readonly IAIAgent<HazardClassificationInput, HazardClassificationResult> _hazardAgent;
        private readonly IAIAgent<AssetRiskInput, AssetRiskResult> _assetRiskAgent;
        private readonly IAIAgent<CostEstimateInput, CostEstimateResult> _costAgent;
        private readonly IAIAgent<SafetyComplianceInput, SafetyComplianceResult> _safetyAgent;
        private readonly IAIAgent<DispatchPriorityInput, DispatchPriorityResult> _dispatchAgent;
        private readonly IAIAgent<MunicipalSafetyAuditInput, MunicipalSafetyAuditResult> _municipalSafetyAuditAgent;
        private readonly AISettings _settings;
        private readonly AppDbContext _db;
        private readonly ILogger<AIAgentOrchestrator> _logger;

        public AIAgentOrchestrator(
            IAIContextBuilder contextBuilder,
            IAIAgent<HazardClassificationInput, HazardClassificationResult> hazardAgent,
            IAIAgent<AssetRiskInput, AssetRiskResult> assetRiskAgent,
            IAIAgent<CostEstimateInput, CostEstimateResult> costAgent,
            IAIAgent<SafetyComplianceInput, SafetyComplianceResult> safetyAgent,
            IAIAgent<DispatchPriorityInput, DispatchPriorityResult> dispatchAgent,
            IAIAgent<MunicipalSafetyAuditInput, MunicipalSafetyAuditResult> municipalSafetyAuditAgent,
            IOptions<AISettings> settings,
            AppDbContext db,
            ILogger<AIAgentOrchestrator> logger)
        {
            _contextBuilder = contextBuilder;
            _hazardAgent = hazardAgent;
            _assetRiskAgent = assetRiskAgent;
            _costAgent = costAgent;
            _safetyAgent = safetyAgent;
            _dispatchAgent = dispatchAgent;
            _municipalSafetyAuditAgent = municipalSafetyAuditAgent;
            _settings = settings.Value;
            _db = db;
            _logger = logger;
        }

        public async Task<HazardClassificationResult> AnalyzeHazardAsync(Guid hazardId, string? triggeredByUserId = null)
        {
            var context = await _contextBuilder.BuildHazardContextAsync(hazardId);
            var result = await _hazardAgent.ExecuteAsync(context);

            await LogAuditActionAsync("HazardClassificationAgent", "Hazard", hazardId.ToString(),
                $"Classified as {result.Category} ({result.Severity} severity, {result.Confidence:P0} confidence)",
                result.Confidence, triggeredByUserId);

            return result;
        }

        public async Task<AssetRiskResult> AnalyzeAssetRiskAsync(string assetId, string? triggeredByUserId = null)
        {
            var context = await _contextBuilder.BuildAssetRiskContextAsync(assetId);
            var result = await _assetRiskAgent.ExecuteAsync(context);

            await LogAuditActionAsync("AssetRiskPredictionAgent", "Asset", assetId,
                $"Predicted risk level {result.RiskLevel} (Score: {result.RiskScore}/100, {result.Confidence:P0} confidence)",
                result.Confidence, triggeredByUserId);

            return result;
        }

        public async Task<CostEstimateResult> EstimateWorkOrderAsync(Guid workOrderId, string? triggeredByUserId = null)
        {
            var context = await _contextBuilder.BuildCostEstimateContextAsync(workOrderId);
            var result = await _costAgent.ExecuteAsync(context);

            await LogAuditActionAsync("CostMaterialEstimatorAgent", "WorkOrder", workOrderId.ToString(),
                $"Estimated repair at LKR {result.EstimatedCost:N0} ({result.Confidence:P0} confidence)",
                result.Confidence, triggeredByUserId);

            return result;
        }

        public async Task<SafetyComplianceResult> AnalyzeSafetyAsync(Guid maintenanceRecordId, string stage = "BeforeMaintenance", string? triggeredByUserId = null)
        {
            var context = await _contextBuilder.BuildSafetyComplianceContextAsync(maintenanceRecordId, stage);
            var result = await _safetyAgent.ExecuteAsync(context);

            await LogAuditActionAsync("SafetyComplianceAgent", "MaintenanceRecord", maintenanceRecordId.ToString(),
                $"Safety risk: {result.SafetyRiskLevel}, Compliance: {result.ComplianceStatus} ({result.Confidence:P0} confidence)",
                result.Confidence, triggeredByUserId);

            return result;
        }

        public async Task<DispatchPriorityResult> OptimizeDispatchAndRouteAsync(DispatchPriorityRequestDto request, string? triggeredByUserId = null)
        {
            var context = await _contextBuilder.BuildDispatchPriorityContextAsync(request.HazardIds, request.Corridor, request.Specialization);
            var result = await _dispatchAgent.ExecuteAsync(context);

            await LogAuditActionAsync("DispatchPriorityAgent", "Corridor", request.Corridor ?? "Multiple",
                $"Optimized dispatch across {context.Hazards.Count} hazards. Score: {result.OverallOptimizationScore}/100. Assigned: {result.SuggestedAssignment.ContractorName}",
                result.Confidence, triggeredByUserId);

            return result;
        }

        public async Task<MunicipalSafetyAuditResult> AuditWorkOrderComplianceAsync(Guid workOrderId, string? triggeredByUserId = null)
        {
            var context = await _contextBuilder.BuildMunicipalSafetyAuditContextAsync(workOrderId);
            var result = await _municipalSafetyAuditAgent.ExecuteAsync(context);

            await LogAuditActionAsync("MunicipalSafetyAuditAgent", "WorkOrder", workOrderId.ToString(),
                $"Audit status: {result.ComplianceStatus} (Score: {result.ComplianceScore}/100). Violations: {result.Violations.Count}",
                result.Confidence, triggeredByUserId);

            return result;
        }

        public async Task<AIWorkflowResult> RunFullAssessmentAsync(Guid hazardId, string? triggeredByUserId = null)
        {
            var workflow = new AIWorkflowResult
            {
                HazardId = hazardId,
                Timestamp = DateTime.UtcNow
            };

            // 1. Hazard Classification
            var classification = await AnalyzeHazardAsync(hazardId, triggeredByUserId);
            workflow.Classification = classification;
            workflow.AuditTrail.Add($"[Step 1 - Hazard Classification] {classification.Category} | Severity: {classification.Severity} | Confidence: {classification.Confidence:P0}");

            // 2. Identify and evaluate related asset
            var hazard = await _db.Hazards.FirstOrDefaultAsync(h => h.Id == hazardId);
            workflow.TicketNumber = hazard?.TicketNumber;

            string? targetAssetId = null;
            if (hazard?.Latitude.HasValue == true && hazard?.Longitude.HasValue == true)
            {
                var nearestAsset = await _db.InfrastructureAssets
                    .Where(a => Math.Abs(a.Latitude - hazard.Latitude.Value) < 0.02 && Math.Abs(a.Longitude - hazard.Longitude.Value) < 0.02)
                    .Select(a => a.Id)
                    .FirstOrDefaultAsync();

                targetAssetId = nearestAsset;
            }

            if (!string.IsNullOrWhiteSpace(targetAssetId))
            {
                var assetRisk = await AnalyzeAssetRiskAsync(targetAssetId, triggeredByUserId);
                workflow.AssetRisk = assetRisk;
                workflow.AuditTrail.Add($"[Step 2 - Asset Risk] Evaluated asset {targetAssetId} | Risk: {assetRisk.RiskLevel} (Score: {assetRisk.RiskScore})");
            }
            else
            {
                workflow.AuditTrail.Add("[Step 2 - Asset Risk] No physical asset mapped within corridor; skipping asset risk prediction.");
            }

            // 3. Find or auto-provision work order for cost estimation
            var workOrder = await _db.WorkOrders.FirstOrDefaultAsync(w => w.HazardId == hazardId);
            if (workOrder == null && hazard != null)
            {
                var woNumber = $"WO-{DateTime.UtcNow:yyyy}-{new Random().Next(1000, 9999)}";
                workOrder = new WorkOrder
                {
                    WorkOrderNumber = woNumber,
                    HazardId = hazardId,
                    AssetId = targetAssetId,
                    Title = $"Repair {classification.Category} at {hazard.Address ?? "Reported Location"}",
                    Description = $"{classification.Reason}\nRecommended Action: {classification.RecommendedAction}",
                    Status = "Draft",
                    Priority = classification.Priority,
                    CreatedBy = triggeredByUserId ?? "AI-System",
                    CreatedAt = DateTime.UtcNow
                };
                _db.WorkOrders.Add(workOrder);
                await _db.SaveChangesAsync();
            }

            if (workOrder != null)
            {
                var cost = await EstimateWorkOrderAsync(workOrder.Id, triggeredByUserId);
                workflow.CostEstimate = cost;
                workflow.AuditTrail.Add($"[Step 3 - Cost Estimation] Estimated cost: LKR {cost.EstimatedCost:N0} | Crew: {cost.RecommendedCrewSize} | Hours: {cost.EstimatedDurationHours}h");

                // 4. Human-in-the-Loop decision evaluation
                if (cost.EstimatedCost >= _settings.DirectorApprovalCost)
                {
                    workflow.WorkflowStatus = "PENDING_DIRECTOR_APPROVAL";
                    workflow.RequiresDirectorReview = true;
                    workflow.RequiresSupervisorReview = true;
                    workflow.DecisionReason = $"Estimated cost (LKR {cost.EstimatedCost:N0}) exceeds Director Approval Threshold (LKR {_settings.DirectorApprovalCost:N0}). Public Works Director electronic authorization required.";
                }
                else if (cost.EstimatedCost >= _settings.SupervisorApprovalCost ||
                         classification.RiskLevel == "HIGH" ||
                         classification.RiskLevel == "CRITICAL")
                {
                    workflow.WorkflowStatus = "PENDING_SUPERVISOR_APPROVAL";
                    workflow.RequiresSupervisorReview = true;
                    workflow.DecisionReason = $"High severity ({classification.Severity}) or cost exceeding LKR {_settings.SupervisorApprovalCost:N0}. Field Maintenance Supervisor review required.";
                }
                else if (classification.Confidence < _settings.MinimumConfidence)
                {
                    workflow.WorkflowStatus = "ACTION_REQUIRED";
                    workflow.RequiresSupervisorReview = true;
                    workflow.DecisionReason = $"AI Confidence ({classification.Confidence:P0}) is below minimum threshold ({_settings.MinimumConfidence:P0}). Mandatory engineering validation required.";
                }
                else
                {
                    workflow.WorkflowStatus = "AUTO_PROCEED";
                    workflow.DecisionReason = "Low/Medium risk with high AI confidence. Automatically routed to contractor dispatch queue.";
                }

                workflow.AuditTrail.Add($"[Step 4 - Governance] Decision: {workflow.WorkflowStatus} ({workflow.DecisionReason})");
            }

            return workflow;
        }

        public async Task<bool> RecordHumanOverrideAsync(AIOverrideRequestDto request, string userId)
        {
            // If there's an associated maintenance record, log to MaintenanceAuditLog
            Guid? maintenanceRecordId = null;
            if (request.EntityType.Equals("MaintenanceRecord", StringComparison.OrdinalIgnoreCase) && Guid.TryParse(request.EntityId, out var mId))
            {
                maintenanceRecordId = mId;
            }
            else if (request.EntityType.Equals("WorkOrder", StringComparison.OrdinalIgnoreCase) && Guid.TryParse(request.EntityId, out var woId))
            {
                maintenanceRecordId = await _db.MaintenanceRecords.Where(m => m.WorkOrderId == woId).Select(m => (Guid?)m.Id).FirstOrDefaultAsync();
            }
            else if (request.EntityType.Equals("Hazard", StringComparison.OrdinalIgnoreCase) && Guid.TryParse(request.EntityId, out var hazId))
            {
                maintenanceRecordId = await _db.MaintenanceRecords.Where(m => m.WorkOrder != null && m.WorkOrder.HazardId == hazId).Select(m => (Guid?)m.Id).FirstOrDefaultAsync();
            }

            if (maintenanceRecordId.HasValue)
            {
                var auditLog = new MaintenanceAuditLog
                {
                    MaintenanceRecordId = maintenanceRecordId.Value,
                    Action = "AI_OVERRIDE",
                    EntityType = request.EntityType,
                    EntityId = request.EntityId,
                    Description = $"[AI_OVERRIDE] {request.EntityType} {request.EntityId}: {request.OriginalValue} -> {request.NewValue}. Reason: {request.OverrideReason}",
                    UserId = userId,
                    Timestamp = DateTime.UtcNow
                };

                _db.MaintenanceAuditLogs.Add(auditLog);
            }

            // Apply override to entity if it's a hazard priority or severity
            if (request.EntityType.Equals("Hazard", StringComparison.OrdinalIgnoreCase) && Guid.TryParse(request.EntityId, out var hazardId))
            {
                var hazard = await _db.Hazards.FirstOrDefaultAsync(h => h.Id == hazardId);
                if (hazard != null && !string.IsNullOrWhiteSpace(request.NewValue))
                {
                    hazard.Priority = request.NewValue;
                    hazard.UpdatedAt = DateTime.UtcNow;
                }
            }

            await _db.SaveChangesAsync();
            return true;
        }

        public async Task<AIDashboardStatsDto> GetDashboardStatsAsync()
        {
            var totalHazardAnalyses = await _db.HazardAIAnalyses.CountAsync();
            var totalAssetAnalyses = await _db.AssetRiskAnalyses.CountAsync();
            var totalCostAnalyses = await _db.WorkOrderAIAnalyses.CountAsync();
            var totalSafetyAnalyses = await _db.MaintenanceSafetyAnalyses.CountAsync();
            var totalAnalyses = totalHazardAnalyses + totalAssetAnalyses + totalCostAnalyses + totalSafetyAnalyses;

            var highRiskHazards = await _db.Hazards
                .Where(h => h.Severity == "HIGH" || h.Severity == "CRITICAL" || h.RiskLevel == "HIGH" || h.RiskLevel == "CRITICAL")
                .CountAsync();

            var lowConfidenceDecisions = await _db.HazardAIAnalyses
                .Where(a => a.Confidence < _settings.MinimumConfidence)
                .CountAsync();

            var pendingReviews = await _db.WorkOrders
                .Where(w => w.Status == "PendingApproval" || w.Status == "Draft")
                .CountAsync();

            double avgConfidence = 0.91;
            if (await _db.HazardAIAnalyses.AnyAsync())
            {
                avgConfidence = await _db.HazardAIAnalyses.AverageAsync(a => a.Confidence);
            }

            var totalEstimated = await _db.WorkOrders.SumAsync(w => w.EstimatedCost ?? 0);
            var totalActual = await _db.WorkOrders.SumAsync(w => (decimal?)w.ActualCost) ?? 0m;

            var overrides = await _db.MaintenanceAuditLogs
                .Where(l => l.Action == "AI_OVERRIDE")
                .CountAsync();

            var accepted = Math.Max(0, totalAnalyses - overrides);

            var safetyIssues = await _db.MaintenanceSafetyAnalyses
                .Where(s => s.SafetyRiskLevel == "HIGH" || s.SafetyRiskLevel == "CRITICAL" || s.ComplianceStatus != "PASS")
                .CountAsync();

            // Recent activity
            var recent = new List<RecentAIActivityDto>();

            var recentHazards = await _db.HazardAIAnalyses
                .OrderByDescending(a => a.CreatedAt)
                .Take(4)
                .Select(a => new RecentAIActivityDto
                {
                    AgentName = "Hazard Classification Agent",
                    EntityType = "Hazard",
                    EntityId = a.HazardId.ToString(),
                    Summary = $"{a.Category ?? "Defect"} classified as {a.Severity} severity",
                    Confidence = a.Confidence,
                    Status = a.Confidence >= 0.75 ? "AI_ANALYZED" : "MANUAL_REVIEW",
                    Timestamp = a.CreatedAt
                })
                .ToListAsync();
            recent.AddRange(recentHazards);

            var recentCosts = await _db.WorkOrderAIAnalyses
                .OrderByDescending(w => w.CreatedAt)
                .Take(3)
                .Select(w => new RecentAIActivityDto
                {
                    AgentName = "Cost & Material Estimator Agent",
                    EntityType = "WorkOrder",
                    EntityId = w.WorkOrderId.ToString(),
                    Summary = $"Estimated cost: LKR {w.EstimatedCost:N0}",
                    Confidence = w.Confidence,
                    Status = w.EstimatedCost >= 100000 ? "PENDING_APPROVAL" : "AI_ANALYZED",
                    Timestamp = w.CreatedAt
                })
                .ToListAsync();
            recent.AddRange(recentCosts);

            var recentSafety = await _db.MaintenanceSafetyAnalyses
                .OrderByDescending(s => s.CreatedAt)
                .Take(3)
                .Select(s => new RecentAIActivityDto
                {
                    AgentName = "Safety & Compliance Agent",
                    EntityType = "MaintenanceRecord",
                    EntityId = s.MaintenanceRecordId.ToString(),
                    Summary = $"Compliance status: {s.ComplianceStatus} ({s.SafetyRiskLevel} risk)",
                    Confidence = s.Confidence,
                    Status = s.ComplianceStatus == "PASS" ? "AI_ANALYZED" : "MANUAL_REVIEW",
                    Timestamp = s.CreatedAt
                })
                .ToListAsync();
            recent.AddRange(recentSafety);

            return new AIDashboardStatsDto
            {
                TotalAnalyses = totalAnalyses,
                HighRiskHazards = highRiskHazards,
                LowConfidenceDecisions = lowConfidenceDecisions,
                PendingReviews = pendingReviews,
                AverageConfidence = Math.Round(avgConfidence, 2),
                TotalEstimatedCost = totalEstimated,
                TotalActualCost = totalActual,
                AcceptedRecommendations = accepted,
                OverriddenRecommendations = overrides,
                SafetyIssuesDetected = safetyIssues,
                RecentActivity = recent.OrderByDescending(r => r.Timestamp).Take(8).ToList()
            };
        }

        private async Task LogAuditActionAsync(string agentName, string entityType, string entityId, string summary, double confidence, string? userId)
        {
            if (entityType.Equals("MaintenanceRecord", StringComparison.OrdinalIgnoreCase) && Guid.TryParse(entityId, out var recId))
            {
                var log = new MaintenanceAuditLog
                {
                    MaintenanceRecordId = recId,
                    Action = "AI_INFERENCE",
                    EntityType = entityType,
                    EntityId = entityId,
                    Description = $"[AI_INFERENCE] {agentName}: {summary} (Confidence: {confidence:P0})",
                    UserId = userId ?? "AI-Orchestrator",
                    Timestamp = DateTime.UtcNow
                };

                _db.MaintenanceAuditLogs.Add(log);
                await _db.SaveChangesAsync();
            }
        }
    }
}
