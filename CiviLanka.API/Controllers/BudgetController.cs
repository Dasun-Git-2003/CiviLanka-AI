using System;
using System.Linq;
using System.Threading.Tasks;
using CiviLanka.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Controllers
{
    public class UpdateThresholdDto
    {
        public decimal NewThreshold { get; set; }
    }

    [ApiController]
    [Route("api/budget")]
    [Produces("application/json")]
    [Authorize(Policy = "CanViewBudget")]
    public class BudgetController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<BudgetController> _logger;

        // In-memory or app-state threshold (defaults to 100,000 LKR)
        private static decimal _approvalThreshold = 100000m;

        public BudgetController(AppDbContext db, ILogger<BudgetController> logger)
        {
            _db = db;
            _logger = logger;
        }

        /// <summary>
        /// Get municipal budget summary.
        /// PublicWorksDirector receives full treasury totals, variances, and threshold configuration.
        /// FieldMaintenanceSupervisor receives operational work-order costs only.
        /// Citizens and Field Workers are strictly denied access.
        /// </summary>
        [HttpGet("summary")]
        [ProducesResponseType(200)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetBudgetSummary()
        {
            var isDirector = User.IsInRole("PublicWorksDirector") || User.IsInRole("Director");

            // Compute actual costs from work orders
            var workOrders = await _db.WorkOrders
                .Where(w => !w.IsCancelled)
                .Select(w => new { w.EstimatedCost, w.ActualCost, w.Priority, w.Status })
                .ToListAsync();

            var totalEstimated = workOrders.Sum(w => w.EstimatedCost ?? 0m);
            var totalActual = workOrders.Sum(w => w.ActualCost ?? 0m);
            var highCostCount = workOrders.Count(w => (w.EstimatedCost ?? 0m) > _approvalThreshold);

            // Compute maintenance costs
            var maintenanceRecords = await _db.MaintenanceRecords
                .Where(m => !m.IsDeleted)
                .Select(m => new { m.ActualCost, m.LabourHours })
                .ToListAsync();

            var totalMaintenanceCost = maintenanceRecords.Sum(m => m.ActualCost);
            var totalLabourHours = maintenanceRecords.Sum(m => m.LabourHours);

            if (isDirector)
            {
                // Full treasury access for Director
                const decimal allocatedTreasuryBudget = 25000000m; // 25 Million LKR
                var totalSpent = totalActual + totalMaintenanceCost;
                var remainingBudget = allocatedTreasuryBudget - totalSpent;

                return Ok(new
                {
                    accessLevel = "FULL",
                    allocatedTreasuryBudget,
                    totalSpent,
                    remainingBudget,
                    burnRatePercent = allocatedTreasuryBudget > 0 ? Math.Round((totalSpent / allocatedTreasuryBudget) * 100m, 1) : 0m,
                    directorApprovalThreshold = _approvalThreshold,
                    workOrdersEstimatedTotal = totalEstimated,
                    workOrdersActualTotal = totalActual,
                    maintenanceActualTotal = totalMaintenanceCost,
                    totalLabourHours,
                    highCostWorkOrdersPendingCount = highCostCount,
                    quarterlyAllocations = new[]
                    {
                        new { quarter = "Q1", allocated = 6000000m, spent = 4800000m, status = "CLOSED" },
                        new { quarter = "Q2", allocated = 6500000m, spent = 5100000m, status = "CLOSED" },
                        new { quarter = "Q3", allocated = 6500000m, spent = 4900000m, status = "ACTIVE" },
                        new { quarter = "Q4", allocated = 6000000m, spent = 1200000m, status = "PROJECTED" }
                    }
                });
            }

            // Limited operational view for Supervisor
            return Ok(new
            {
                accessLevel = "OPERATIONAL_LIMITED",
                workOrdersEstimatedTotal = totalEstimated,
                workOrdersActualTotal = totalActual,
                maintenanceActualTotal = totalMaintenanceCost,
                totalLabourHours,
                activeWorkOrdersCount = workOrders.Count(w => w.Status != "COMPLETED" && w.Status != "CLOSED"),
                notice = "Treasury allocations and approval threshold settings are restricted to PublicWorksDirector."
            });
        }

        /// <summary>
        /// Configure high-cost work order approval threshold (PublicWorksDirector only).
        /// </summary>
        [HttpPost("threshold")]
        [Authorize(Policy = "CanManageBudget")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        public IActionResult UpdateThreshold([FromBody] UpdateThresholdDto dto)
        {
            if (dto.NewThreshold <= 0)
                return BadRequest(new { message = "Threshold must be greater than 0 LKR." });

            _approvalThreshold = dto.NewThreshold;
            _logger.LogInformation("Director updated approval threshold to {Threshold} LKR", _approvalThreshold);

            return Ok(new
            {
                message = "Director approval threshold updated successfully.",
                approvalThreshold = _approvalThreshold
            });
        }
    }
}
