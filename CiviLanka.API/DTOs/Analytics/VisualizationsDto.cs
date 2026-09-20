using System;
using System.Collections.Generic;

namespace CiviLanka.API.DTOs.Analytics
{
    public class VisualizationsResponseDto
    {
        // ── Primary Summary KPI Metrics ──────────────────────────────────────
        public int TotalAssets { get; set; }
        public int OptimalAssetsCount { get; set; }
        public int FairAssetsCount { get; set; }
        public int PoorAssetsCount { get; set; }
        public double OptimalPercent { get; set; }
        public double FairPercent { get; set; }
        public double PoorPercent { get; set; }

        public int TotalHazards { get; set; }
        public int ActiveHazardsCount { get; set; }
        public int CriticalHazardsCount { get; set; }
        public int InProgressHazardsCount { get; set; }
        public int ResolvedHazardsCount { get; set; }

        public int TotalWorkOrders { get; set; }
        public int ActiveWorkOrdersCount { get; set; }
        public int CompletedWorkOrdersCount { get; set; }
        public decimal TotalEstimatedCost { get; set; }
        public decimal TotalActualCost { get; set; }
        public double AverageTurnaroundDays { get; set; }

        public int TotalMaintenanceRecords { get; set; }
        public int VerifiedMaintenanceCount { get; set; }
        public double AiVerificationRate { get; set; }
        public double AverageSafetyScore { get; set; }

        // ── Chart 1: Resolution Velocity & Trends ───────────────────────────
        public List<ResolutionTrendPointDto> ResolutionTrends { get; set; } = new();

        // ── Chart 2: Asset Condition Distribution ───────────────────────────
        public List<AssetConditionSliceDto> AssetConditionDistribution { get; set; } = new();

        // ── Chart 3: Sector Incident & Workload Breakdown ───────────────────
        public List<SectorIncidentDto> SectorIncidents { get; set; } = new();

        // ── Chart 4: Safety Compliance Radar ────────────────────────────────
        public List<SafetyRadarMetricDto> SafetyComplianceRadar { get; set; } = new();

        // ── Chart 5: Budget vs Actual Expenditure ───────────────────────────
        public List<BudgetQuarterDto> BudgetExpenditures { get; set; } = new();
    }

    public class ResolutionTrendPointDto
    {
        public string Month { get; set; } = string.Empty;
        public int Reported { get; set; }
        public int Resolved { get; set; }
        public int AiVerified { get; set; }
    }

    public class AssetConditionSliceDto
    {
        public string Name { get; set; } = string.Empty;
        public int Value { get; set; }
        public string Color { get; set; } = string.Empty;
        public string Pct { get; set; } = string.Empty;
    }

    public class SectorIncidentDto
    {
        public string Sector { get; set; } = string.Empty;
        public int Active { get; set; }
        public int Resolved { get; set; }
        public decimal Budget { get; set; } // in thousands LKR or LKR
    }

    public class SafetyRadarMetricDto
    {
        public string Metric { get; set; } = string.Empty;
        public int Score { get; set; }
        public int FullMark { get; set; } = 100;
    }

    public class BudgetQuarterDto
    {
        public string Quarter { get; set; } = string.Empty;
        public decimal Allocated { get; set; }
        public decimal Actual { get; set; }
        public decimal Variance { get; set; }
    }
}
