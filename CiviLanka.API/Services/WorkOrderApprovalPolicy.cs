using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using CiviLanka.API.Models;
using CiviLanka.API.Models.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CiviLanka.API.Services
{
    public class WorkOrderApprovalEvaluation
    {
        public bool RequiresDirectorApproval { get; set; }
        public bool IsArterialRoad { get; set; }
        public bool IsHighRiskArterialRoad => IsArterialRoad;
        public bool IsThresholdExceeded { get; set; }
        public string ApprovalReason { get; set; } = WorkOrderApprovalReason.None;
        public string Reason => ApprovalReason;
        public string InitialStatus => RequiresDirectorApproval ? WorkOrderStatus.PendingApproval : WorkOrderStatus.AiGenerated;
        public string InitialApprovalStatus => RequiresDirectorApproval ? ApprovalStatus.Pending : ApprovalStatus.NotRequired;
    }

    public interface IWorkOrderApprovalPolicy
    {
        WorkOrderApprovalEvaluation EvaluateLocations(
            decimal? estimatedCost,
            string? hazardAddress = null,
            string? hazardDescription = null,
            string? assetLocation = null,
            string? assetName = null,
            string? title = null,
            string? description = null);

        WorkOrderApprovalEvaluation Evaluate(
            decimal? estimatedCost,
            Hazard? hazard = null,
            InfrastructureAsset? asset = null,
            string? title = null,
            string? description = null);

        bool IsArterialRoad(params string?[] locationTexts);

        decimal GetApprovalThreshold();
    }

    public class WorkOrderApprovalPolicy : IWorkOrderApprovalPolicy
    {
        private readonly IConfiguration _config;
        private readonly ILogger<WorkOrderApprovalPolicy>? _logger;

        public const decimal DefaultApprovalThreshold = 100000m;

        public static readonly string[] DefaultHighRiskArterialKeywords = new[]
        {
            "Galle Road",
            "Galle Rd",
            "Kandy Road",
            "Kandy Rd",
            "High Level Road",
            "High Level Rd",
            "Baseline Road",
            "Baseline Rd",
            "Duplication Road",
            "Negombo Road",
            "Negombo Rd",
            "Arterial"
        };

        public WorkOrderApprovalPolicy(IConfiguration config, ILogger<WorkOrderApprovalPolicy>? logger = null)
        {
            _config = config;
            _logger = logger;
        }

        public decimal GetApprovalThreshold()
        {
            return _config.GetValue<decimal>("WorkOrderSettings:DirectorApprovalThreshold", DefaultApprovalThreshold);
        }

        public IEnumerable<string> GetKeywords()
        {
            var configured = _config.GetSection("WorkOrderSettings:HighRiskArterialKeywords").Get<string[]>();
            if (configured != null && configured.Length > 0)
            {
                return configured;
            }
            return DefaultHighRiskArterialKeywords;
        }

        public bool IsArterialRoad(params string?[] locationTexts)
        {
            if (locationTexts == null || locationTexts.Length == 0) return false;

            var keywords = GetKeywords();

            foreach (var text in locationTexts)
            {
                if (string.IsNullOrWhiteSpace(text)) continue;

                foreach (var keyword in keywords)
                {
                    if (string.IsNullOrWhiteSpace(keyword)) continue;

                    var trimmed = keyword.Trim().TrimEnd('.');
                    if (string.IsNullOrEmpty(trimmed)) continue;

                    // \b ensures whole-word or boundary matching, preventing false positives like 'Material' matching 'Arterial'
                    var pattern = $@"\b{Regex.Escape(trimmed)}\b";
                    if (Regex.IsMatch(text, pattern, RegexOptions.IgnoreCase))
                    {
                        return true;
                    }
                }
            }

            return false;
        }

        public WorkOrderApprovalEvaluation Evaluate(
            decimal? estimatedCost,
            Hazard? hazard = null,
            InfrastructureAsset? asset = null,
            string? title = null,
            string? description = null)
        {
            return EvaluateLocations(
                estimatedCost,
                hazard?.Address,
                hazard?.Description,
                asset?.Location,
                asset?.Name,
                title,
                description);
        }

        public WorkOrderApprovalEvaluation EvaluateLocations(
            decimal? estimatedCost,
            string? hazardAddress = null,
            string? hazardDescription = null,
            string? assetLocation = null,
            string? assetName = null,
            string? title = null,
            string? description = null)
        {
            var threshold = GetApprovalThreshold();
            bool thresholdExceeded = estimatedCost.HasValue && estimatedCost.Value > threshold;
            bool isArterial = IsArterialRoad(
                hazardAddress,
                hazardDescription,
                assetLocation,
                assetName,
                title,
                description);

            bool requiresApproval = thresholdExceeded || isArterial;

            string reason = (thresholdExceeded, isArterial) switch
            {
                (true, true)  => WorkOrderApprovalReason.Both,
                (true, false) => WorkOrderApprovalReason.ThresholdExceeded,
                (false, true) => WorkOrderApprovalReason.ArterialRoadRisk,
                _             => WorkOrderApprovalReason.None
            };

            return new WorkOrderApprovalEvaluation
            {
                RequiresDirectorApproval = requiresApproval,
                IsArterialRoad = isArterial,
                IsThresholdExceeded = thresholdExceeded,
                ApprovalReason = reason
            };
        }
    }
}
