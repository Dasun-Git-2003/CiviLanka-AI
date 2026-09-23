using System;
using System.Collections.Generic;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using Microsoft.Extensions.Options;

namespace CiviLanka.API.AI.Services
{
    public class AIConfidenceService : IAIConfidenceService
    {
        private readonly AISettings _settings;

        public AIConfidenceService(IOptions<AISettings> settings)
        {
            _settings = settings.Value;
        }

        public AIConfidenceEvaluation EvaluateHazardConfidence(double rawConfidence, HazardClassificationInput context)
        {
            var factors = new List<string>();
            double contextScore = 0.5;

            if (context.Latitude.HasValue && context.Longitude.HasValue)
            {
                contextScore += 0.25;
                factors.Add("Precise geodetic coordinates verified");
            }
            else
            {
                contextScore -= 0.15;
                factors.Add("Missing GPS coordinates (-15% context penalty)");
            }

            if (!string.IsNullOrWhiteSpace(context.ImageUrl))
            {
                contextScore += 0.20;
                factors.Add("Citizen photographic evidence uploaded");
            }
            else
            {
                contextScore -= 0.15;
                factors.Add("Zero citizen photographic evidence attached (-15% context penalty)");
            }

            if (context.Description?.Length > 30)
            {
                contextScore += 0.15;
                factors.Add("Detailed citizen narrative description");
            }
            else
            {
                contextScore -= 0.10;
                factors.Add("Short/sparse citizen description (-10% context penalty)");
            }

            double historyScore = 0.4;
            if (context.NearbyHazardsSummary.Count > 0)
            {
                historyScore += 0.35;
                factors.Add($"{context.NearbyHazardsSummary.Count} nearby incidents correlated");
            }
            if (context.HistoricalIncidentsSummary.Count > 0)
            {
                historyScore += 0.35;
                factors.Add("Corridor historical incident telemetry linked");
            }

            contextScore = Math.Clamp(contextScore, 0.1, 1.0);
            historyScore = Math.Clamp(historyScore, 0.1, 1.0);

            // 60% Model Confidence + 25% Context Completeness + 15% History Availability
            double finalScore = (rawConfidence * 0.60) + (contextScore * 0.25) + (historyScore * 0.15);
            finalScore = Math.Round(Math.Clamp(finalScore, 0.1, 0.99), 2);

            return BuildEvaluation(rawConfidence, contextScore, historyScore, finalScore, factors);
        }

        public AIConfidenceEvaluation EvaluateAssetConfidence(double rawConfidence, AssetRiskInput context)
        {
            var factors = new List<string>();
            double contextScore = 0.5;

            if (context.AgeYears.HasValue)
            {
                contextScore += 0.2;
                factors.Add($"Asset age confirmed ({context.AgeYears} years)");
            }
            if (!string.IsNullOrWhiteSpace(context.Location))
            {
                contextScore += 0.15;
                factors.Add("Asset GIS location verified");
            }

            double historyScore = 0.4;
            if (context.RecentInspections.Count > 0)
            {
                historyScore += 0.35;
                factors.Add($"{context.RecentInspections.Count} physical inspection reports evaluated");
            }
            else
            {
                factors.Add("No prior condition inspections found (-20% confidence penalty)");
            }

            if (context.MaintenanceHistory.Count > 0)
            {
                historyScore += 0.25;
                factors.Add($"{context.MaintenanceHistory.Count} maintenance work orders on record");
            }

            contextScore = Math.Clamp(contextScore, 0.2, 1.0);
            historyScore = Math.Clamp(historyScore, 0.2, 1.0);

            double finalScore = (rawConfidence * 0.55) + (contextScore * 0.25) + (historyScore * 0.20);
            finalScore = Math.Round(Math.Clamp(finalScore, 0.1, 0.99), 2);

            return BuildEvaluation(rawConfidence, contextScore, historyScore, finalScore, factors);
        }

        public AIConfidenceEvaluation EvaluateCostConfidence(double rawConfidence, CostEstimateInput context)
        {
            var factors = new List<string>();
            double contextScore = 0.5;

            if (!string.IsNullOrWhiteSpace(context.HazardCategory) && !string.IsNullOrWhiteSpace(context.HazardSeverity))
            {
                contextScore += 0.3;
                factors.Add($"Known category and severity ({context.HazardCategory} / {context.HazardSeverity})");
            }

            double historyScore = 0.3;
            if (context.HistoricalMaterialRates.Count > 0)
            {
                historyScore += 0.4;
                factors.Add($"{context.HistoricalMaterialRates.Count} database material benchmark rates loaded");
            }
            else
            {
                factors.Add("Sparse historical material pricing data; defaulted to standard schedule");
            }

            if (context.PreviousSimilarWorkOrders.Count > 0)
            {
                historyScore += 0.3;
                factors.Add($"{context.PreviousSimilarWorkOrders.Count} similar completed municipal work orders calibrated");
            }

            contextScore = Math.Clamp(contextScore, 0.2, 1.0);
            historyScore = Math.Clamp(historyScore, 0.2, 1.0);

            double finalScore = (rawConfidence * 0.50) + (contextScore * 0.25) + (historyScore * 0.25);
            finalScore = Math.Round(Math.Clamp(finalScore, 0.1, 0.99), 2);

            return BuildEvaluation(rawConfidence, contextScore, historyScore, finalScore, factors);
        }

        public AIConfidenceEvaluation EvaluateSafetyConfidence(double rawConfidence, SafetyComplianceInput context)
        {
            var factors = new List<string>();
            double contextScore = 0.4;

            if (context.HasBeforeImage && context.HasAfterImage)
            {
                contextScore += 0.3;
                factors.Add("Complete photographic evidence (before & after photos confirmed)");
            }
            else if (context.HasBeforeImage || context.HasAfterImage)
            {
                contextScore += 0.15;
                factors.Add("Partial photographic evidence present");
            }
            else
            {
                factors.Add("Zero photographic evidence attached (-25% confidence penalty)");
            }

            if (!string.IsNullOrWhiteSpace(context.SafetyChecklist))
            {
                contextScore += 0.2;
                factors.Add("Digital safety checklist submitted by contractor");
            }

            if (context.LabourHours > 0)
            {
                contextScore += 0.1;
                factors.Add($"Labour hours verified ({context.LabourHours} hrs)");
            }

            double historyScore = 0.6;
            contextScore = Math.Clamp(contextScore, 0.2, 1.0);

            double finalScore = (rawConfidence * 0.60) + (contextScore * 0.40);
            finalScore = Math.Round(Math.Clamp(finalScore, 0.1, 0.99), 2);

            return BuildEvaluation(rawConfidence, contextScore, historyScore, finalScore, factors);
        }

        private AIConfidenceEvaluation BuildEvaluation(
            double rawConfidence, double contextScore, double historyScore, double finalScore, List<string> factors)
        {
            var rating = finalScore switch
            {
                >= 0.90 => "VERY_HIGH",
                >= 0.80 => "HIGH",
                >= 0.70 => "MODERATE",
                >= 0.50 => "LOW",
                _ => "VERY_LOW"
            };

            bool requiresReview = finalScore < _settings.MinimumConfidence;
            if (requiresReview)
            {
                factors.Add($"Confidence ({finalScore:P0}) is below minimum threshold ({_settings.MinimumConfidence:P0}); mandatory human review triggered");
            }

            return new AIConfidenceEvaluation
            {
                ModelConfidence = Math.Round(rawConfidence, 2),
                ContextCompletenessScore = Math.Round(contextScore, 2),
                HistoricalDataAvailabilityScore = Math.Round(historyScore, 2),
                FinalConfidence = finalScore,
                ConfidenceRating = rating,
                RequiresHumanReview = requiresReview,
                ConfidenceFactors = factors
            };
        }
    }
}
