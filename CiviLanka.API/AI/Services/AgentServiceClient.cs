using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CiviLanka.API.AI.Services
{
    public class AgentServiceClient : IAgentServiceClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<AgentServiceClient> _logger;
        private readonly string _agentServiceUrl;

        public AgentServiceClient(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<AgentServiceClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            _agentServiceUrl = configuration["AgentService:BaseUrl"] ?? "http://127.0.0.1:8001";
            _httpClient.BaseAddress = new Uri(_agentServiceUrl);
            _httpClient.Timeout = TimeSpan.FromSeconds(15);
        }

        public async Task<bool> IsAgentServiceAvailableAsync()
        {
            try
            {
                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(2));
                var response = await _httpClient.GetAsync("/health", cts.Token);
                return response.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        public async Task<HazardClassificationResult?> ClassifyHazardViaAgentAsync(HazardClassificationInput input)
        {
            try
            {
                var payload = new
                {
                    title = input.CategorySupplied ?? "Hazard Report",
                    description = input.Description,
                    location = input.Address ?? "Colombo",
                    image_url = input.ImageUrl
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("/api/agent/hazard/classify", content);
                if (!response.IsSuccessStatusCode)
                    return null;

                var jsonStr = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonStr);
                if (!doc.RootElement.TryGetProperty("classification", out var c))
                    return null;

                var category = c.TryGetProperty("primary_category", out var catProp) ? catProp.GetString() ?? "Other" : "Other";
                var severity = c.TryGetProperty("assigned_severity", out var sevProp) ? sevProp.GetString() ?? "MEDIUM" : "MEDIUM";
                var urgency = c.TryGetProperty("urgency_score", out var urgProp) ? urgProp.GetDouble() : 50.0;
                var sla = c.TryGetProperty("sla_resolution_hours", out var slaProp) ? slaProp.GetInt32() : 24;
                var reason = c.TryGetProperty("safety_risk_summary", out var rProp) ? rProp.GetString() ?? "" : "";
                var crew = c.TryGetProperty("crew_sizing", out var crwProp) ? crwProp.GetString() ?? "2-person" : "2-person";

                int crewSize = crew.Contains("4") ? 4 : (crew.Contains("3") ? 3 : 2);

                return new HazardClassificationResult
                {
                    Category = category,
                    Severity = severity,
                    RiskLevel = severity,
                    Priority = severity == "CRITICAL" ? "URGENT" : (severity == "HIGH" ? "HIGH" : "NORMAL"),
                    Confidence = 0.95,
                    Reason = reason,
                    RecommendedAction = $"Follow Colombo Municipal SLA window ({sla} hours). {reason}",
                    RecommendedCrewSize = crewSize,
                    EstimatedResponseHours = sla,
                    ModelName = "langgraph-agent-rag",
                    Status = "AI_ANALYZED",
                    Timestamp = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Agent service call to /api/agent/hazard/classify failed; falling back to internal agent.");
                return null;
            }
        }

        public async Task<CostEstimateResult?> EstimateCostViaAgentAsync(CostEstimateInput input)
        {
            try
            {
                var payload = new
                {
                    hazard_type = input.HazardCategory ?? "General Defect",
                    severity = input.HazardSeverity ?? "Medium",
                    asset_name = input.AssetType ?? "Municipal Asset",
                    asset_type = input.AssetType ?? "Civil",
                    damage_description = input.WorkDescription ?? "Standard repair required",
                    location = input.Location ?? "Colombo"
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("/api/agent/estimate", content);
                if (!response.IsSuccessStatusCode)
                    return null;

                var jsonStr = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonStr);
                if (!doc.RootElement.TryGetProperty("estimate", out var est))
                    return null;

                var totalCost = est.TryGetProperty("total_estimated_cost_lkr", out var tcProp) ? tcProp.GetDecimal() : 50000m;
                var durationDays = est.TryGetProperty("estimated_duration_days", out var durProp) ? durProp.GetInt32() : 2;
                var contractor = est.TryGetProperty("recommended_contractor_specialization", out var contProp) ? contProp.GetString() ?? "Civil" : "Civil";
                var summary = est.TryGetProperty("summary", out var smProp) ? smProp.GetString() ?? "" : "";

                var materials = new List<MaterialItemEstimate>();
                decimal materialTotal = 0m;
                if (est.TryGetProperty("materials", out var mats) && mats.ValueKind == JsonValueKind.Array)
                {
                    foreach (var m in mats.EnumerateArray())
                    {
                        var qty = m.TryGetProperty("quantity", out var qProp) ? qProp.GetDecimal() : 1m;
                        var rate = m.TryGetProperty("unit_cost_lkr", out var ucProp) ? ucProp.GetDecimal() : 0m;
                        materialTotal += qty * rate;
                        materials.Add(new MaterialItemEstimate
                        {
                            Name = m.TryGetProperty("item_name", out var inProp) ? inProp.GetString() ?? "Material" : "Material",
                            Quantity = qty,
                            Unit = m.TryGetProperty("unit", out var uProp) ? uProp.GetString() ?? "unit" : "unit",
                            EstimatedUnitCost = rate,
                        });
                    }
                }

                bool requiresSupervisor = totalCost >= 100000m;
                bool requiresDirector = totalCost >= 500000m;

                return new CostEstimateResult
                {
                    EstimatedCost = totalCost,
                    MaterialCost = materialTotal,
                    LabourCost = Math.Max(0m, (totalCost - materialTotal) * 0.6m),
                    EquipmentCost = Math.Max(0m, (totalCost - materialTotal) * 0.4m),
                    EstimatedDurationHours = durationDays * 8,
                    Confidence = 0.92,
                    Materials = materials,
                    Reason = summary,
                    Recommendation = $"Recommended contractor trade: {contractor}.",
                    RequiresSupervisorApproval = requiresSupervisor,
                    RequiresDirectorApproval = requiresDirector,
                    ModelName = "langgraph-bsr-rag",
                    Status = requiresSupervisor ? "PENDING_APPROVAL" : "AI_ANALYZED",
                    Timestamp = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Agent service call to /api/agent/estimate failed; falling back to internal agent.");
                return null;
            }
        }

        public async Task<DispatchPriorityResult?> OptimizeDispatchViaAgentAsync(DispatchPriorityInput input)
        {
            try
            {
                var hazardsList = input.Hazards.Select(h => new
                {
                    id = h.HazardId.ToString(),
                    title = $"{h.Category} - {h.TicketNumber}",
                    severity = h.Severity,
                    location = h.Address,
                    latitude = h.Latitude ?? 6.9271,
                    longitude = h.Longitude ?? 79.8612,
                    category = h.Category
                }).ToList();

                var contractorsList = input.AvailableContractors.Select(c => new
                {
                    id = c.ContractorId.ToString(),
                    name = c.Name,
                    specialization = c.Specialization,
                    rating = c.Rating
                }).ToList();

                var payload = new
                {
                    hazards = hazardsList,
                    contractors = contractorsList
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("/api/agent/dispatch/optimize", content);
                if (!response.IsSuccessStatusCode)
                    return null;

                var jsonStr = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonStr);
                if (!doc.RootElement.TryGetProperty("optimization_output", out var opt))
                    return null;

                var rankedHazards = new List<RankedHazardItem>();
                if (opt.TryGetProperty("ranked_hazards", out var rhList) && rhList.ValueKind == JsonValueKind.Array)
                {
                    foreach (var item in rhList.EnumerateArray())
                    {
                        rankedHazards.Add(new RankedHazardItem
                        {
                            HazardId = item.TryGetProperty("hazard_id", out var hid) ? hid.GetString() ?? "" : "",
                            TicketNumber = item.TryGetProperty("hazard_id", out var tProp) ? tProp.GetString() ?? "" : "",
                            DispatchRank = item.TryGetProperty("urgency_rank", out var rankProp) ? rankProp.GetInt32() : 1,
                            PriorityScore = (int)(item.TryGetProperty("composite_priority_score", out var pProp) ? pProp.GetDouble() : 50.0),
                            UrgencyTier = item.TryGetProperty("severity", out var sProp) ? sProp.GetString() ?? "MEDIUM" : "MEDIUM",
                            Reason = item.TryGetProperty("rationale", out var ratProp) ? ratProp.GetString() ?? "" : ""
                        });
                    }
                }

                var clusters = new List<RouteCluster>();
                if (opt.TryGetProperty("route_clusters", out var rcList) && rcList.ValueKind == JsonValueKind.Array)
                {
                    foreach (var c in rcList.EnumerateArray())
                    {
                        var hids = new List<string>();
                        if (c.TryGetProperty("hazard_ids", out var hIdsArray) && hIdsArray.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var elem in hIdsArray.EnumerateArray())
                                hids.Add(elem.GetString() ?? "");
                        }

                        clusters.Add(new RouteCluster
                        {
                            ClusterName = c.TryGetProperty("cluster_name", out var cname) ? cname.GetString() ?? "" : "",
                            Corridor = c.TryGetProperty("cluster_name", out var cCorridor) ? cCorridor.GetString() ?? "Colombo Metropolitan" : "Colombo Metropolitan",
                            HazardTickets = hids,
                            EstimatedDistanceKm = c.TryGetProperty("radius_km", out var rkm) ? rkm.GetDouble() * 2.0 : 5.0,
                            EstimatedTravelTimeMinutes = c.TryGetProperty("estimated_transit_minutes", out var ctm) ? ctm.GetInt32() : 30,
                            RecommendedSequence = hids
                        });
                    }
                }

                var suggestedAssignment = new SuggestedContractorAssignment();
                if (opt.TryGetProperty("crew_assignments", out var caList) && caList.ValueKind == JsonValueKind.Array && caList.GetArrayLength() > 0)
                {
                    var firstAssign = caList[0];
                    suggestedAssignment.ContractorName = firstAssign.TryGetProperty("contractor_name", out var cn) ? cn.GetString() ?? "" : "";
                    suggestedAssignment.Specialization = firstAssign.TryGetProperty("trade", out var tr) ? tr.GetString() ?? "" : "";
                    suggestedAssignment.AssignmentRationale = firstAssign.TryGetProperty("assignment_reason", out var ar) ? ar.GetString() ?? "" : "";
                }

                return new DispatchPriorityResult
                {
                    OverallOptimizationScore = 92,
                    RankedHazards = rankedHazards,
                    RouteClusters = clusters,
                    SuggestedAssignment = suggestedAssignment,
                    TradeoffAnalysis = opt.TryGetProperty("optimization_strategy_summary", out var oss) ? oss.GetString() ?? "" : "Corridor-based route clustering",
                    Confidence = 0.94,
                    ModelName = "langgraph-dispatch-optimizer",
                    Status = "OPTIMIZED",
                    Timestamp = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Agent service call to /api/agent/dispatch/optimize failed; falling back to internal agent.");
                return null;
            }
        }

        public async Task<MunicipalSafetyAuditResult?> AuditSafetyViaAgentAsync(MunicipalSafetyAuditInput input)
        {
            try
            {
                var payload = new
                {
                    work_order = new
                    {
                        id = input.WorkOrderId.ToString(),
                        workOrderId = input.WorkOrderNumber,
                        totalCost = (double)(input.ActualCost ?? input.EstimatedCost),
                        approvedBy = input.ApprovalStatus,
                        beforeImageUrl = input.BeforeImageUrl,
                        afterImageUrl = input.AfterImageUrl,
                        hazardLatitude = input.WorkOrderLatitude ?? 0.0,
                        hazardLongitude = input.WorkOrderLongitude ?? 0.0,
                        completionLatitude = input.ExecutionLatitude ?? 0.0,
                        completionLongitude = input.ExecutionLongitude ?? 0.0,
                        safetyChecklistPassed = !string.IsNullOrWhiteSpace(input.SafetyChecklist)
                    }
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("/api/agent/safety/audit", content);
                if (!response.IsSuccessStatusCode)
                    return null;

                var jsonStr = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonStr);
                if (!doc.RootElement.TryGetProperty("audit_output", out var audit))
                    return null;

                var complianceStatus = audit.TryGetProperty("compliance_status", out var csProp) ? csProp.GetString() ?? "PASS" : "PASS";
                var summary = audit.TryGetProperty("audit_summary", out var asProp) ? asProp.GetString() ?? "" : "";
                var gpsPassed = audit.TryGetProperty("gps_verification_passed", out var gpProp) && gpProp.GetBoolean();
                var evidPassed = audit.TryGetProperty("evidence_verification_passed", out var epProp) && epProp.GetBoolean();

                var violations = new List<SafetyAuditViolation>();
                if (audit.TryGetProperty("violations", out var viols) && viols.ValueKind == JsonValueKind.Array)
                {
                    foreach (var v in viols.EnumerateArray())
                    {
                        violations.Add(new SafetyAuditViolation
                        {
                            RuleCode = v.TryGetProperty("rule_id", out var rId) ? rId.GetString() ?? "" : "",
                            Severity = v.TryGetProperty("severity", out var sv) ? sv.GetString() ?? "HIGH" : "HIGH",
                            Description = v.TryGetProperty("description", out var ds) ? ds.GetString() ?? "" : "",
                            RemedialAction = v.TryGetProperty("remediation_step", out var rm) ? rm.GetString() ?? "" : "",
                        });
                    }
                }

                int score = complianceStatus == "PASS" ? 100 : (complianceStatus == "CONDITIONAL_APPROVAL" ? 75 : 30);

                return new MunicipalSafetyAuditResult
                {
                    ComplianceStatus = complianceStatus,
                    ComplianceScore = score,
                    SafetyRulesPassed = violations.All(v => v.RuleCode != "SEC-CHK-01"),
                    BudgetThresholdsApproved = violations.All(v => !v.RuleCode.StartsWith("FISC-")),
                    CompletionEvidenceVerified = evidPassed,
                    GpsVerificationPassed = gpsPassed,
                    Violations = violations,
                    AuditFindings = summary,
                    Recommendation = complianceStatus == "PASS" ? "Approved for municipal invoice settlement." : "Remediation required before final settlement.",
                    RequiresDirectorEscalation = violations.Any(v => v.RuleCode.StartsWith("FISC-DIR")),
                    Confidence = 0.96,
                    ModelName = "langgraph-compliance-auditor",
                    Status = "AUDITED",
                    Timestamp = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Agent service call to /api/agent/safety/audit failed; falling back to internal agent.");
                return null;
            }
        }

        public async Task<AssetRiskResult?> AnalyzeAssetRiskViaAgentAsync(AssetRiskInput input)
        {
            try
            {
                var payload = new
                {
                    asset = new
                    {
                        id = input.AssetId,
                        name = input.Name,
                        category = input.Type,
                        location = input.Location,
                        ageYears = input.AgeYears ?? 5.0
                    }
                };

                var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync("/api/agent/asset/analyze-risk", content);
                if (!response.IsSuccessStatusCode)
                    return null;

                var jsonStr = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonStr);
                if (!doc.RootElement.TryGetProperty("risk_output", out var risk))
                    return null;

                var tier = risk.TryGetProperty("current_condition_tier", out var tProp) ? tProp.GetInt32() : 2;
                var health = risk.TryGetProperty("health_index_score", out var hProp) ? hProp.GetDouble() : 60.0;
                var action = risk.TryGetProperty("recommended_action", out var aProp) ? aProp.GetString() ?? "" : "";
                var cadence = risk.TryGetProperty("preventive_maintenance_cadence", out var cProp) ? cProp.GetString() ?? "Monthly" : "Monthly";
                var narrative = risk.TryGetProperty("risk_narrative", out var nProp) ? nProp.GetString() ?? "" : "";

                string riskLevel = tier switch
                {
                    4 => "CRITICAL",
                    3 => "HIGH",
                    2 => "MEDIUM",
                    _ => "LOW"
                };

                return new AssetRiskResult
                {
                    RiskLevel = riskLevel,
                    RiskScore = (int)(100.0 - health),
                    Confidence = 0.93,
                    ConditionAssessment = $"Tier {tier} (Health {health:F1}/100)",
                    FailureLikelihood = tier >= 3 ? "High" : (tier == 2 ? "Moderate" : "Low"),
                    Reason = narrative,
                    RecommendedInspectionFrequency = cadence,
                    RecommendedAction = action,
                    Urgency = tier >= 4 ? "Immediate" : (tier == 3 ? "High" : "Medium"),
                    ModelName = "langgraph-asset-degradation",
                    Status = "AI_ANALYZED",
                    Timestamp = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Agent service call to /api/agent/asset/analyze-risk failed; falling back to internal agent.");
                return null;
            }
        }
    }
}
