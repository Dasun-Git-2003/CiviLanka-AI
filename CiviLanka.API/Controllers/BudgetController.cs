using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using CiviLanka.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CiviLanka.API.Controllers
{
    public class UpdateThresholdDto
    {
        public decimal NewThreshold { get; set; }
    }

    public class AddBudgetAllocationDto
    {
        public decimal Amount { get; set; }
        public string AllocationType { get; set; } = "TOP_UP"; // "TOP_UP" or "SET_TOTAL"
        public string? Sector { get; set; } = "All Municipal Sectors";
        public string? Notes { get; set; }
    }

    public class BudgetState
    {
        public decimal TotalAllocatedBudget { get; set; } = 25000000m;
        public decimal ApprovalThreshold { get; set; } = 0m;
        public List<BudgetAllocationItem> History { get; set; } = new();
    }

    public class BudgetAllocationItem
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public decimal Amount { get; set; }
        public string AllocationType { get; set; } = "TOP_UP";
        public string Sector { get; set; } = "All Municipal Sectors";
        public string AllocatedBy { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    [ApiController]
    [Route("api/budget")]
    [Produces("application/json")]
    [Authorize(Policy = "CanViewBudget")]
    public class BudgetController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly ILogger<BudgetController> _logger;

        private static readonly object _fileLock = new();
        private static readonly string _stateFilePath = Path.Combine(AppContext.BaseDirectory, "budget_state.json");

        public BudgetController(AppDbContext db, ILogger<BudgetController> logger)
        {
            _db = db;
            _logger = logger;
        }

        private static BudgetState LoadBudgetState()
        {
            lock (_fileLock)
            {
                try
                {
                    if (System.IO.File.Exists(_stateFilePath))
                    {
                        var json = System.IO.File.ReadAllText(_stateFilePath);
                        var state = JsonSerializer.Deserialize<BudgetState>(json);
                        if (state != null) return state;
                    }
                }
                catch
                {
                    // Fall back to default on parse failure
                }

                var defaultState = new BudgetState
                {
                    TotalAllocatedBudget = 25000000m,
                    ApprovalThreshold = 0m,
                    History = new List<BudgetAllocationItem>
                    {
                        new BudgetAllocationItem
                        {
                            Amount = 25000000m,
                            AllocationType = "INITIAL_TREASURY_ALLOCATION",
                            Sector = "All Municipal Sectors",
                            AllocatedBy = "director@civilanka.gov.lk",
                            Notes = "Approved FY2026 Annual Infrastructure Capital Budget",
                            Timestamp = DateTime.UtcNow.AddMonths(-2)
                        }
                    }
                };
                SaveBudgetState(defaultState);
                return defaultState;
            }
        }

        private static void SaveBudgetState(BudgetState state)
        {
            lock (_fileLock)
            {
                try
                {
                    var json = JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = true });
                    System.IO.File.WriteAllText(_stateFilePath, json);
                }
                catch
                {
                    // Ignore file write errors
                }
            }
        }

        /// <summary>
        /// Get municipal operational budget summary.
        /// PublicWorksDirector receives full treasury totals, top-up capabilities, and threshold controls.
        /// FieldMaintenanceSupervisor receives operational work-order costs and remaining balances.
        /// </summary>
        [HttpGet("summary")]
        [ProducesResponseType(200)]
        [ProducesResponseType(403)]
        public async Task<IActionResult> GetBudgetSummary()
        {
            var isDirector = User.IsInRole("PublicWorksDirector") || User.IsInRole("Director");
            var state = LoadBudgetState();

            // Fetch live work orders
            var workOrders = await _db.WorkOrders
                .Include(w => w.Hazard)
                .Where(w => !w.IsCancelled)
                .Select(w => new
                {
                    w.Id,
                    w.EstimatedCost,
                    w.ActualCost,
                    w.Status,
                    w.Title,
                    Category = w.Hazard != null ? w.Hazard.Category : ""
                })
                .ToListAsync();

            // Fetch live maintenance records
            var maintenanceRecords = await _db.MaintenanceRecords
                .Where(m => !m.IsDeleted)
                .Select(m => new { m.ActualCost, m.LabourHours, m.WorkOrderId })
                .ToListAsync();

            // Completed work orders cost
            var completedWos = workOrders
                .Where(w => w.Status == "COMPLETED" || w.Status == "VERIFIED" || w.Status == "CLOSED")
                .ToList();
            var completedCost = completedWos.Sum(w => w.ActualCost ?? w.EstimatedCost ?? 0m);

            // Maintenance records actual cost
            var totalMaintenanceCost = maintenanceRecords.Sum(m => m.ActualCost);
            var totalLabourHours = maintenanceRecords.Sum(m => m.LabourHours);

            // Disbursed (Spent)
            var totalSpent = completedCost + totalMaintenanceCost;

            // In-flight (Committed)
            var inFlightWos = workOrders
                .Where(w => w.Status != "COMPLETED" && w.Status != "VERIFIED" && w.Status != "CLOSED" && w.Status != "REJECTED" && w.Status != "CANCELLED")
                .ToList();
            var totalCommitted = inFlightWos.Sum(w => w.EstimatedCost ?? 0m);

            var totalAllocated = state.TotalAllocatedBudget;
            var remainingBudget = Math.Max(0m, totalAllocated - (totalSpent + totalCommitted));
            var burnRatePercent = totalAllocated > 0
                ? Math.Round(((totalSpent + totalCommitted) / totalAllocated) * 100m, 1)
                : 0m;
            var actualSpentPercent = totalAllocated > 0
                ? Math.Round((totalSpent / totalAllocated) * 100m, 1)
                : 0m;

            // Department / Sector Breakdown
            var sectors = new[]
            {
                new { Key = "ROADS", Name = "Roads & Transport", Share = 0.40m, Keywords = new[] { "road", "pothole", "asphalt", "traffic", "pavement", "street" } },
                new { Key = "WATER", Name = "Water Supply & Drainage", Share = 0.25m, Keywords = new[] { "water", "pipe", "leak", "drain", "sewer", "flood" } },
                new { Key = "ELECTRICAL", Name = "Electrical & Lighting", Share = 0.15m, Keywords = new[] { "electric", "light", "pole", "wire", "lamp", "power" } },
                new { Key = "STRUCTURAL", Name = "Bridges & Civil Structures", Share = 0.12m, Keywords = new[] { "bridge", "culvert", "structural", "retaining", "wall", "concrete" } },
                new { Key = "SANITATION", Name = "Sanitation & Public Works", Share = 0.08m, Keywords = new[] { "waste", "garbage", "sanitation", "clean", "debris" } }
            };

            var departmentBreakdown = sectors.Select(sec =>
            {
                var allocated = Math.Round(totalAllocated * sec.Share, 0);

                var deptWos = workOrders.Where(w =>
                {
                    var text = $"{w.Category} {w.Title}".ToLowerInvariant();
                    return sec.Keywords.Any(k => text.Contains(k));
                }).ToList();

                var deptSpent = deptWos
                    .Where(w => w.Status == "COMPLETED" || w.Status == "VERIFIED" || w.Status == "CLOSED")
                    .Sum(w => w.ActualCost ?? w.EstimatedCost ?? 0m);

                var deptCommitted = deptWos
                    .Where(w => w.Status != "COMPLETED" && w.Status != "VERIFIED" && w.Status != "CLOSED" && w.Status != "REJECTED" && w.Status != "CANCELLED")
                    .Sum(w => w.EstimatedCost ?? 0m);

                var deptRemaining = Math.Max(0m, allocated - (deptSpent + deptCommitted));
                var util = allocated > 0 ? Math.Min(100, Math.Round(((deptSpent + deptCommitted) / allocated) * 100m, 1)) : 0m;

                return new
                {
                    department = sec.Name,
                    allocated,
                    spent = deptSpent,
                    committed = deptCommitted,
                    remaining = deptRemaining,
                    utilizationPercent = util
                };
            }).ToList();

            var quarterlyAllocations = new[]
            {
                new { quarter = "Q1", allocated = Math.Round(totalAllocated * 0.25m, 0), spent = Math.Round(totalSpent * 0.40m, 0), status = "CLOSED" },
                new { quarter = "Q2", allocated = Math.Round(totalAllocated * 0.25m, 0), spent = Math.Round(totalSpent * 0.35m, 0), status = "CLOSED" },
                new { quarter = "Q3", allocated = Math.Round(totalAllocated * 0.25m, 0), spent = Math.Round(totalSpent * 0.25m, 0), status = "ACTIVE" },
                new { quarter = "Q4", allocated = Math.Round(totalAllocated * 0.25m, 0), spent = 0m, status = "PROJECTED" }
            };

            return Ok(new
            {
                accessLevel = isDirector ? "FULL" : "OPERATIONAL_LIMITED",
                isDirector,
                totalAllocatedBudget = totalAllocated,
                allocatedTreasuryBudget = totalAllocated,
                totalSpent,
                totalCommitted,
                remainingBudget,
                uncommittedBudget = remainingBudget,
                burnRatePercent,
                actualSpentPercent,
                directorApprovalThreshold = state.ApprovalThreshold,
                requireDirectorApprovalAlways = true,
                fiscalYear = DateTime.UtcNow.Year,
                workOrdersEstimatedTotal = inFlightWos.Sum(w => w.EstimatedCost ?? 0m),
                workOrdersActualTotal = completedCost,
                maintenanceActualTotal = totalMaintenanceCost,
                totalLabourHours,
                activeWorkOrdersCount = inFlightWos.Count,
                departmentBreakdown,
                quarterlyAllocations,
                allocationHistory = state.History.Take(15),
                notice = isDirector ? null : "Operational view: Budget top-ups and treasury allocations are authorized by the Public Works Director."
            });
        }

        /// <summary>
        /// Allocate additional budget or set total treasury allocation (PublicWorksDirector only).
        /// </summary>
        [HttpPost("allocate")]
        [Authorize(Policy = "CanManageBudget")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(403)]
        public IActionResult AllocateBudget([FromBody] AddBudgetAllocationDto dto)
        {
            if (dto.Amount <= 0)
                return BadRequest(new { message = "Budget allocation amount must be greater than 0 LKR." });

            var userEmail = User.FindFirst(ClaimTypes.Email)?.Value
                ?? User.Identity?.Name
                ?? "PublicWorksDirector";

            var state = LoadBudgetState();

            if (string.Equals(dto.AllocationType, "SET_TOTAL", StringComparison.OrdinalIgnoreCase))
            {
                state.TotalAllocatedBudget = dto.Amount;
            }
            else
            {
                state.TotalAllocatedBudget += dto.Amount;
            }

            var record = new BudgetAllocationItem
            {
                Id = Guid.NewGuid(),
                Amount = dto.Amount,
                AllocationType = dto.AllocationType ?? "TOP_UP",
                Sector = string.IsNullOrWhiteSpace(dto.Sector) ? "All Municipal Sectors" : dto.Sector,
                AllocatedBy = userEmail,
                Notes = string.IsNullOrWhiteSpace(dto.Notes) ? "Authorized supplementary budget allocation." : dto.Notes,
                Timestamp = DateTime.UtcNow
            };

            state.History.Insert(0, record);
            SaveBudgetState(state);

            _logger.LogInformation("Director {User} allocated {Amount} LKR ({Type}) for {Sector}", userEmail, dto.Amount, dto.AllocationType, record.Sector);

            return Ok(new
            {
                message = "Budget successfully allocated and ledger updated.",
                totalAllocatedBudget = state.TotalAllocatedBudget,
                allocation = record
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
            if (dto.NewThreshold < 0)
                return BadRequest(new { message = "Threshold must be non-negative." });

            var state = LoadBudgetState();
            state.ApprovalThreshold = dto.NewThreshold;
            SaveBudgetState(state);

            _logger.LogInformation("Director updated approval threshold to {Threshold} LKR", dto.NewThreshold);

            return Ok(new
            {
                message = "Director approval threshold updated successfully.",
                approvalThreshold = state.ApprovalThreshold
            });
        }
    }
}
