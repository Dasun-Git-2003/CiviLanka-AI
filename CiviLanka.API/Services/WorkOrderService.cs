using CiviLanka.API.Agents;
using CiviLanka.API.Data;
using CiviLanka.API.DTOs.WorkOrders;
using CiviLanka.API.Models;
using CiviLanka.API.Repositories;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Services
{
    public interface IWorkOrderService
    {
        Task<WorkOrderResponseDto> CreateAsync(CreateWorkOrderDto dto, string createdByUserId);
        Task<WorkOrderResponseDto?> GetByIdAsync(Guid id);
        Task<List<WorkOrderResponseDto>> GetAllAsync();
        Task<List<WorkOrderResponseDto>> GetByStatusAsync(string status);
        Task<List<WorkOrderResponseDto>> GetByHazardIdAsync(Guid hazardId);
        Task<List<WorkOrderResponseDto>> GetPendingApprovalAsync();
        Task<WorkOrderResponseDto?> UpdateAsync(Guid id, UpdateWorkOrderDto dto);
        Task<WorkOrderResponseDto?> UpdateStatusAsync(Guid id, string status, string? notes);
        Task<bool> CancelAsync(Guid id);
        Task<WorkOrderResponseDto?> GenerateEstimateAsync(Guid workOrderId, CostEstimateRequestDto? dto = null);
        Task<WorkOrderResponseDto?> ApproveAsync(Guid id, string approvedByUserId, string? notes);
        Task<WorkOrderResponseDto?> RejectAsync(Guid id, string rejectedByUserId, string? notes);
        Task<CostEstimateResponseDto?> GetLatestEstimateAsync(Guid workOrderId);
        Task<CostEstimatePreviewResponseDto?> PreviewEstimateAsync(CostEstimateRequestDto input);
        Task<CostEstimatePreviewResponseDto?> PreviewEstimateForWorkOrderAsync(Guid workOrderId, CostEstimateRequestDto? overrideDto = null);
        Task<WorkOrderResponseDto?> SaveCustomEstimateAsync(Guid workOrderId, SaveWorkOrderEstimateDto dto);
    }

    public class WorkOrderService : IWorkOrderService
    {
        private readonly IWorkOrderRepository _repo;
        private readonly ICostEstimatorAgent _agent;
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;
        private readonly ILogger<WorkOrderService> _logger;

        public WorkOrderService(
            IWorkOrderRepository repo,
            ICostEstimatorAgent agent,
            AppDbContext db,
            IConfiguration config,
            ILogger<WorkOrderService> logger)
        {
            _repo   = repo;
            _agent  = agent;
            _db     = db;
            _config = config;
            _logger = logger;
        }

        // ── CREATE ────────────────────────────────────────────────────────────

        public async Task<WorkOrderResponseDto> CreateAsync(CreateWorkOrderDto dto, string createdByUserId)
        {
            // Generate ticket number WO-YYYY-NNNNN with collision guard
            var seq = await _repo.GetNextSequenceAsync();
            var number = $"WO-{DateTime.UtcNow.Year}-{seq:D5}";

            int attempts = 0;
            while (await _repo.ExistsWorkOrderNumberAsync(number))
            {
                attempts++;
                number = $"WO-{DateTime.UtcNow.Year}-{(seq + attempts):D5}";
            }

            // Pull severity from the linked hazard's AI analysis
            string? severity = null;
            if (dto.HazardId.HasValue)
            {
                var hazard = await _db.Hazards
                    .Include(h => h.AIAnalyses.OrderByDescending(a => a.CreatedAt).Take(1))
                    .FirstOrDefaultAsync(h => h.Id == dto.HazardId.Value);
                severity = hazard?.Severity ?? hazard?.AIAnalyses.FirstOrDefault()?.Severity;
            }

            var workOrder = new WorkOrder
            {
                WorkOrderNumber = number,
                HazardId        = dto.HazardId,
                AssetId         = dto.AssetId,
                Title           = dto.Title,
                Description     = dto.Description,
                Priority        = dto.Priority.ToUpperInvariant(),
                Severity        = severity,
                AssignedCrew    = dto.AssignedCrew,
                ScheduledDate   = dto.ScheduledDate.HasValue
                    ? (dto.ScheduledDate.Value.Kind == DateTimeKind.Unspecified
                        ? DateTime.SpecifyKind(dto.ScheduledDate.Value, DateTimeKind.Utc)
                        : dto.ScheduledDate.Value.ToUniversalTime())
                    : null,
                EstimatedCost   = dto.EstimatedCost,
                EstimatedDurationHours = dto.EstimatedDurationHours.HasValue ? (int)dto.EstimatedDurationHours.Value : null,
                RecommendedCrewSize    = dto.RecommendedCrewSize,
                Status          = WorkOrderStatus.AiGenerated,
                ApprovalStatus  = Models.ApprovalStatus.NotRequired,
                CreatedBy       = createdByUserId,
            };

            // Check if approval is required based on cost threshold or mandatory policy
            var requireAlways = _config.GetValue<bool>("WorkOrderSettings:RequireDirectorApprovalAlways", false);
            var threshold = _config.GetValue<decimal>("WorkOrderSettings:DirectorApprovalThreshold", 100000);
            if (requireAlways || threshold == 0m || (dto.EstimatedCost.HasValue && dto.EstimatedCost.Value > threshold))
            {
                workOrder.ApprovalRequired = true;
                workOrder.ApprovalStatus   = Models.ApprovalStatus.Pending;
                workOrder.Status           = WorkOrderStatus.PendingApproval;
            }

            var created = await _repo.CreateAsync(workOrder);

            if (dto.Items != null && dto.Items.Count > 0)
            {
                var workOrderItems = dto.Items.Select(m => new WorkOrderItem
                {
                    WorkOrderId        = created.Id,
                    ItemType           = string.IsNullOrWhiteSpace(m.ItemType) ? WorkOrderItemType.Material : m.ItemType,
                    ItemName           = m.ItemName,
                    Quantity           = m.Quantity,
                    Unit               = m.Unit,
                    EstimatedUnitCost  = m.EstimatedUnitCost,
                    EstimatedTotalCost = m.EstimatedTotalCost > 0 ? m.EstimatedTotalCost : (m.EstimatedUnitCost * (decimal)m.Quantity),
                }).ToList();
                await _repo.AddItemsAsync(workOrderItems);
            }

            if (dto.EstimatedCost.HasValue || (dto.Items != null && dto.Items.Count > 0))
            {
                var materialSum = dto.MaterialCost ?? (dto.Items != null ? dto.Items.Where(i => i.ItemType == WorkOrderItemType.Material || string.IsNullOrEmpty(i.ItemType)).Sum(i => i.EstimatedTotalCost > 0 ? i.EstimatedTotalCost : (i.EstimatedUnitCost * (decimal)i.Quantity)) : 0);
                var estimate = new CostEstimate
                {
                    WorkOrderId            = created.Id,
                    EstimatedCost          = dto.EstimatedCost ?? (materialSum + (dto.LabourCost ?? 0) + (dto.EquipmentCost ?? 0)),
                    Currency               = "LKR",
                    MaterialCost           = materialSum,
                    LabourCost             = dto.LabourCost ?? 0,
                    EquipmentCost          = dto.EquipmentCost ?? 0,
                    EstimatedLabourHours   = dto.EstimatedLabourHours ?? 0,
                    RecommendedCrewSize    = dto.RecommendedCrewSize ?? 1,
                    EstimatedDurationHours = dto.EstimatedDurationHours ?? 0,
                    Confidence             = 0.95,
                    Reason                 = dto.EstimateReason ?? "Customized estimate during work order creation",
                    ModelName              = "Custom / AI Assisted",
                };
                await _repo.AddCostEstimateAsync(estimate);
            }

            if (created.Status == WorkOrderStatus.Approved || created.Status == WorkOrderStatus.Assigned)
            {
                await EnsureMaintenanceRecordDispatchedAsync(created, createdByUserId);
            }

            return await MapToResponseDtoAsync(created.Id);
        }

        // ── READ ──────────────────────────────────────────────────────────────

        public async Task<WorkOrderResponseDto?> GetByIdAsync(Guid id)
        {
            var wo = await _repo.GetByIdWithDetailsAsync(id);
            return wo == null ? null : MapToDto(wo,
                await _repo.GetLatestCostEstimateAsync(id),
                await _repo.GetLatestAIAnalysisAsync(id),
                await _db.WorkOrderItems.Where(i => i.WorkOrderId == id).ToListAsync());
        }

        public async Task<List<WorkOrderResponseDto>> GetAllAsync()
        {
            var list = await _repo.GetAllActiveAsync();
            return list.Select(wo => MapToDto(wo,
                wo.CostEstimates.OrderByDescending(c => c.CreatedAt).FirstOrDefault(),
                null, new List<WorkOrderItem>())).ToList();
        }

        public async Task<List<WorkOrderResponseDto>> GetByStatusAsync(string status) =>
            (await _repo.GetByStatusAsync(status)).Select(wo =>
                MapToDto(wo, wo.CostEstimates.OrderByDescending(c => c.CreatedAt).FirstOrDefault(),
                    null, new List<WorkOrderItem>())).ToList();

        public async Task<List<WorkOrderResponseDto>> GetByHazardIdAsync(Guid hazardId) =>
            (await _repo.GetByHazardIdAsync(hazardId)).Select(wo =>
                MapToDto(wo, wo.CostEstimates.OrderByDescending(c => c.CreatedAt).FirstOrDefault(),
                    null, new List<WorkOrderItem>())).ToList();

        public async Task<List<WorkOrderResponseDto>> GetPendingApprovalAsync() =>
            (await _repo.GetPendingApprovalAsync()).Select(wo =>
                MapToDto(wo, wo.CostEstimates.OrderByDescending(c => c.CreatedAt).FirstOrDefault(),
                    null, new List<WorkOrderItem>())).ToList();

        // ── UPDATE ────────────────────────────────────────────────────────────

        public async Task<WorkOrderResponseDto?> UpdateAsync(Guid id, UpdateWorkOrderDto dto)
        {
            var wo = await _repo.GetByIdAsync(id);
            if (wo == null || wo.IsCancelled) return null;

            if (dto.Title != null)               wo.Title = dto.Title;
            if (dto.Description != null)         wo.Description = dto.Description;
            if (dto.Priority != null)            wo.Priority = dto.Priority.ToUpperInvariant();
            if (dto.AssignedContractorId != null) wo.AssignedContractorId = dto.AssignedContractorId;
            if (dto.AssignedCrew != null)        wo.AssignedCrew = dto.AssignedCrew;
            if (dto.ScheduledDate != null)
            {
                wo.ScheduledDate = dto.ScheduledDate.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(dto.ScheduledDate.Value, DateTimeKind.Utc)
                    : dto.ScheduledDate.Value.ToUniversalTime();
            }
            if (dto.EstimatedCost != null)       wo.EstimatedCost = dto.EstimatedCost;
            if (dto.ApprovedBudget != null)      wo.ApprovedBudget = dto.ApprovedBudget;
            if (dto.ActualCost != null)          wo.ActualCost = dto.ActualCost;
            if (dto.Notes != null)               wo.Notes = dto.Notes;

            if (dto.Status != null && !string.Equals(wo.Status, dto.Status, StringComparison.OrdinalIgnoreCase))
            {
                if (!WorkOrderStatus.CanTransition(wo.Status, dto.Status))
                {
                    var allowed = WorkOrderStatus.GetAllowedNextStatuses(wo.Status);
                    throw new InvalidOperationException(
                        $"Cannot transition work order from '{wo.Status}' to '{dto.Status}'. Allowed next statuses: {(allowed.Length > 0 ? string.Join(", ", allowed) : "None (terminal state)")}.");
                }
                wo.Status = dto.Status.ToUpperInvariant();
            }

            // Re-evaluate approval when cost changes or mandatory policy
            var requireAlways = _config.GetValue<bool>("WorkOrderSettings:RequireDirectorApprovalAlways", false);
            var threshold = _config.GetValue<decimal>("WorkOrderSettings:DirectorApprovalThreshold", 100000);
            if ((requireAlways || threshold == 0m || (dto.EstimatedCost.HasValue && dto.EstimatedCost.Value > threshold))
                && wo.ApprovalStatus == Models.ApprovalStatus.NotRequired)
            {
                wo.ApprovalRequired = true;
                wo.ApprovalStatus   = Models.ApprovalStatus.Pending;
                wo.Status           = WorkOrderStatus.PendingApproval;
            }

            await _repo.UpdateAsync(wo);
            if (wo.Status == WorkOrderStatus.Approved || wo.Status == WorkOrderStatus.Assigned)
            {
                await EnsureMaintenanceRecordDispatchedAsync(wo, "supervisor@civilanka.gov.lk");
            }
            return await MapToResponseDtoAsync(id);
        }

        public async Task<WorkOrderResponseDto?> UpdateStatusAsync(Guid id, string status, string? notes)
        {
            var wo = await _repo.GetByIdAsync(id);
            if (wo == null || wo.IsCancelled) return null;
            if (!WorkOrderStatus.All.Contains(status, StringComparer.OrdinalIgnoreCase))
            {
                throw new ArgumentException($"Invalid status '{status}'. Valid statuses: {string.Join(", ", WorkOrderStatus.All)}.");
            }

            if (!WorkOrderStatus.CanTransition(wo.Status, status))
            {
                var allowed = WorkOrderStatus.GetAllowedNextStatuses(wo.Status);
                throw new InvalidOperationException(
                    $"Cannot transition work order from '{wo.Status}' to '{status}'. Allowed next statuses: {(allowed.Length > 0 ? string.Join(", ", allowed) : "None (terminal state)")}.");
            }

            wo.Status = status.ToUpperInvariant();
            if (notes != null) wo.Notes = notes;
            await _repo.UpdateAsync(wo);
            if (wo.Status == WorkOrderStatus.Approved || wo.Status == WorkOrderStatus.Assigned)
            {
                await EnsureMaintenanceRecordDispatchedAsync(wo, "supervisor@civilanka.gov.lk");
            }
            return await MapToResponseDtoAsync(id);
        }

        // ── DELETE (SOFT CANCEL) ──────────────────────────────────────────────

        public async Task<bool> CancelAsync(Guid id)
        {
            var wo = await _repo.GetByIdAsync(id);
            if (wo == null || wo.IsCancelled) return false;

            if (!WorkOrderStatus.CanTransition(wo.Status, WorkOrderStatus.Cancelled))
            {
                throw new InvalidOperationException($"Cannot cancel work order in terminal status '{wo.Status}'.");
            }

            wo.IsCancelled = true;
            wo.Status      = WorkOrderStatus.Cancelled;
            await _repo.UpdateAsync(wo);
            return true;
        }

        // ── AI ESTIMATE ───────────────────────────────────────────────────────

        public async Task<WorkOrderResponseDto?> GenerateEstimateAsync(Guid workOrderId, CostEstimateRequestDto? overrideDto = null)
        {
            var wo = await _repo.GetByIdWithDetailsAsync(workOrderId);
            if (wo == null) return null;

            // Build input from work order + linked entities
            var hazard = wo.Hazard;
            var asset  = wo.Asset;

            var input = new CostEstimationInput
            {
                Category     = overrideDto?.Category ?? hazard?.Category ?? wo.Title,
                Description  = overrideDto?.Description ?? hazard?.Description ?? wo.Description,
                Severity     = overrideDto?.Severity ?? hazard?.Severity ?? wo.Severity,
                RiskLevel    = hazard?.RiskLevel,
                Priority     = overrideDto?.Priority ?? hazard?.Priority ?? wo.Priority,
                Location     = hazard?.Address,
                AssetId      = overrideDto?.AssetId ?? wo.AssetId,
                AssetType    = asset?.Type,
                AssetCondition = asset?.Inspections
                    .OrderByDescending(i => i.InspectionDate).FirstOrDefault()?.Condition,
                AssetAgeYears = asset?.InstallationDate.HasValue == true
                    ? (int)((DateTime.UtcNow - asset.InstallationDate.Value).TotalDays / 365)
                    : null
            };

            var result = await _agent.EstimateAsync(input);
            if (result == null)
            {
                _logger.LogWarning("AI agent returned no result for WorkOrder {Id}", workOrderId);
                return null;
            }

            // Validate core constraints (Section 20)
            result.EstimatedCost         = Math.Max(0, result.EstimatedCost);
            result.MaterialCost          = Math.Max(0, result.MaterialCost);
            result.LabourCost            = Math.Max(0, result.LabourCost);
            result.EquipmentCost         = Math.Max(0, result.EquipmentCost);
            result.RecommendedCrewSize   = Math.Max(1, result.RecommendedCrewSize);
            result.EstimatedDurationHours = Math.Max(0, result.EstimatedDurationHours);
            result.Confidence            = Math.Clamp(result.Confidence, 0.0, 1.0);

            // Persist CostEstimate
            var estimate = new CostEstimate
            {
                WorkOrderId           = workOrderId,
                EstimatedCost         = result.EstimatedCost,
                Currency              = result.Currency,
                MaterialCost          = result.MaterialCost,
                LabourCost            = result.LabourCost,
                EquipmentCost         = result.EquipmentCost,
                EstimatedLabourHours  = result.EstimatedLabourHours,
                RecommendedCrewSize   = result.RecommendedCrewSize,
                EstimatedDurationHours = result.EstimatedDurationHours,
                Confidence            = result.Confidence,
                Reason                = result.Reason,
                ModelName             = result.ModelName,
            };
            await _repo.AddCostEstimateAsync(estimate);

            // Persist WorkOrderItems (replace existing)
            await _repo.RemoveItemsAsync(workOrderId);
            var items = result.Materials.Select(m => new WorkOrderItem
            {
                WorkOrderId          = workOrderId,
                ItemType             = WorkOrderItemType.Material,
                ItemName             = m.Name,
                Quantity             = m.Quantity,
                Unit                 = m.Unit,
                EstimatedUnitCost    = m.UnitCost,
                EstimatedTotalCost   = m.UnitCost * (decimal)m.Quantity,
            }).ToList();
            items.AddRange(result.Equipment.Select(e => new WorkOrderItem
            {
                WorkOrderId          = workOrderId,
                ItemType             = WorkOrderItemType.Equipment,
                ItemName             = e,
                Quantity             = 1,
                Unit                 = "unit",
                EstimatedUnitCost    = result.EquipmentCost / Math.Max(result.Equipment.Count, 1),
                EstimatedTotalCost   = result.EquipmentCost / Math.Max(result.Equipment.Count, 1),
            }));
            await _repo.AddItemsAsync(items);

            // Persist AI Analysis (history)
            var analysis = new WorkOrderAIAnalysis
            {
                WorkOrderId    = workOrderId,
                AgentName      = "CostEstimatorAgent",
                EstimatedCost  = result.EstimatedCost,
                Recommendation = result.Recommendation,
                Reason         = result.Reason,
                Confidence     = result.Confidence,
            };
            await _repo.AddAIAnalysisAsync(analysis);

            // Update work order with AI-generated values
            wo.EstimatedCost          = result.EstimatedCost;
            wo.EstimatedDurationHours = (int)result.EstimatedDurationHours;
            wo.RecommendedCrewSize    = result.RecommendedCrewSize;

            // Check approval threshold or mandatory policy
            var requireAlways = _config.GetValue<bool>("WorkOrderSettings:RequireDirectorApprovalAlways", false);
            var threshold = _config.GetValue<decimal>("WorkOrderSettings:DirectorApprovalThreshold", 100000);
            if (requireAlways || threshold == 0m || result.EstimatedCost > threshold)
            {
                wo.ApprovalRequired = true;
                wo.ApprovalStatus   = Models.ApprovalStatus.Pending;
                wo.Status           = WorkOrderStatus.PendingApproval;
            }

            await _repo.UpdateAsync(wo);
            return await MapToResponseDtoAsync(workOrderId);
        }

        public async Task<CostEstimatePreviewResponseDto?> PreviewEstimateAsync(CostEstimateRequestDto inputDto)
        {
            var input = new CostEstimationInput
            {
                Category       = inputDto.Category ?? "General Infrastructure Repair",
                Description    = inputDto.Description ?? string.Empty,
                Severity       = inputDto.Severity ?? "MEDIUM",
                Priority       = inputDto.Priority ?? "NORMAL",
                AssetId        = inputDto.AssetId,
            };

            if (inputDto.HazardId.HasValue)
            {
                var hazard = await _db.Hazards
                    .Include(h => h.AIAnalyses.OrderByDescending(a => a.CreatedAt).Take(1))
                    .FirstOrDefaultAsync(h => h.Id == inputDto.HazardId.Value);
                if (hazard != null)
                {
                    input.Category    = string.IsNullOrWhiteSpace(inputDto.Category) ? hazard.Category : inputDto.Category;
                    input.Description = string.IsNullOrWhiteSpace(inputDto.Description) ? hazard.Description : inputDto.Description;
                    input.Severity    = string.IsNullOrWhiteSpace(inputDto.Severity) ? (hazard.Severity ?? hazard.AIAnalyses.FirstOrDefault()?.Severity ?? "MEDIUM") : inputDto.Severity;
                    input.Priority    = string.IsNullOrWhiteSpace(inputDto.Priority) ? (hazard.Priority ?? "NORMAL") : inputDto.Priority;
                    input.Location    = hazard.Address;
                    input.RiskLevel   = hazard.RiskLevel;
                }
            }

            if (!string.IsNullOrWhiteSpace(inputDto.AssetId))
            {
                var asset = await _db.InfrastructureAssets
                    .Include(a => a.Inspections.OrderByDescending(i => i.InspectionDate).Take(1))
                    .FirstOrDefaultAsync(a => a.Id == inputDto.AssetId);
                if (asset != null)
                {
                    input.AssetType = asset.Type;
                    input.AssetCondition = asset.Inspections.FirstOrDefault()?.Condition;
                    input.AssetAgeYears = asset.InstallationDate.HasValue
                        ? (int)((DateTime.UtcNow - asset.InstallationDate.Value).TotalDays / 365)
                        : null;
                }
            }

            var result = await _agent.EstimateAsync(input);
            if (result == null) return null;

            return BuildPreviewDto(result);
        }

        public async Task<CostEstimatePreviewResponseDto?> PreviewEstimateForWorkOrderAsync(Guid workOrderId, CostEstimateRequestDto? overrideDto = null)
        {
            var wo = await _repo.GetByIdWithDetailsAsync(workOrderId);
            if (wo == null) return null;

            var hazard = wo.Hazard;
            var asset  = wo.Asset;

            var input = new CostEstimationInput
            {
                Category       = overrideDto?.Category ?? hazard?.Category ?? wo.Title,
                Description    = overrideDto?.Description ?? hazard?.Description ?? wo.Description,
                Severity       = overrideDto?.Severity ?? hazard?.Severity ?? wo.Severity,
                RiskLevel      = hazard?.RiskLevel,
                Priority       = overrideDto?.Priority ?? hazard?.Priority ?? wo.Priority,
                Location       = hazard?.Address,
                AssetId        = overrideDto?.AssetId ?? wo.AssetId,
                AssetType      = asset?.Type,
                AssetCondition = asset?.Inspections
                    .OrderByDescending(i => i.InspectionDate).FirstOrDefault()?.Condition,
                AssetAgeYears  = asset?.InstallationDate.HasValue == true
                    ? (int)((DateTime.UtcNow - asset.InstallationDate.Value).TotalDays / 365)
                    : null
            };

            var result = await _agent.EstimateAsync(input);
            if (result == null) return null;

            return BuildPreviewDto(result);
        }

        private static CostEstimatePreviewResponseDto BuildPreviewDto(CostEstimationResult result)
        {
            var items = result.Materials.Select(m => new WorkOrderItemResponseDto
            {
                Id                 = Guid.NewGuid(),
                ItemType           = WorkOrderItemType.Material,
                ItemName           = m.Name,
                Quantity           = m.Quantity,
                Unit               = m.Unit,
                EstimatedUnitCost  = m.UnitCost,
                EstimatedTotalCost = m.UnitCost * (decimal)m.Quantity,
            }).ToList();

            items.AddRange(result.Equipment.Select(e => new WorkOrderItemResponseDto
            {
                Id                 = Guid.NewGuid(),
                ItemType           = WorkOrderItemType.Equipment,
                ItemName           = e,
                Quantity           = 1,
                Unit               = "unit",
                EstimatedUnitCost  = result.EquipmentCost / Math.Max(result.Equipment.Count, 1),
                EstimatedTotalCost = result.EquipmentCost / Math.Max(result.Equipment.Count, 1),
            }));

            return new CostEstimatePreviewResponseDto
            {
                EstimatedCost          = Math.Max(0, result.EstimatedCost),
                Currency               = result.Currency,
                MaterialCost           = Math.Max(0, result.MaterialCost),
                LabourCost             = Math.Max(0, result.LabourCost),
                EquipmentCost          = Math.Max(0, result.EquipmentCost),
                EstimatedLabourHours   = result.EstimatedLabourHours,
                RecommendedCrewSize    = Math.Max(1, result.RecommendedCrewSize),
                EstimatedDurationHours = Math.Max(0, result.EstimatedDurationHours),
                Confidence             = Math.Clamp(result.Confidence, 0.0, 1.0),
                Reason                 = result.Reason,
                ModelName              = result.ModelName,
                Items                  = items,
            };
        }

        public async Task<WorkOrderResponseDto?> SaveCustomEstimateAsync(Guid workOrderId, SaveWorkOrderEstimateDto dto)
        {
            var wo = await _repo.GetByIdAsync(workOrderId);
            if (wo == null || wo.IsCancelled) return null;

            // Update WorkOrder items (replace existing)
            await _repo.RemoveItemsAsync(workOrderId);
            var items = dto.Items.Select(i => new WorkOrderItem
            {
                WorkOrderId        = workOrderId,
                ItemType           = string.IsNullOrWhiteSpace(i.ItemType) ? WorkOrderItemType.Material : i.ItemType,
                ItemName           = i.ItemName,
                Quantity           = i.Quantity,
                Unit               = i.Unit,
                EstimatedUnitCost  = i.EstimatedUnitCost,
                EstimatedTotalCost = i.EstimatedTotalCost > 0 ? i.EstimatedTotalCost : (i.EstimatedUnitCost * (decimal)i.Quantity),
            }).ToList();
            await _repo.AddItemsAsync(items);

            var materialSum = dto.MaterialCost ?? items.Where(x => x.ItemType == WorkOrderItemType.Material).Sum(x => x.EstimatedTotalCost);

            // Persist CostEstimate
            var estimate = new CostEstimate
            {
                WorkOrderId            = workOrderId,
                EstimatedCost          = dto.EstimatedCost,
                Currency               = "LKR",
                MaterialCost           = materialSum,
                LabourCost             = dto.LabourCost ?? 0,
                EquipmentCost          = dto.EquipmentCost ?? 0,
                EstimatedLabourHours   = dto.EstimatedLabourHours ?? 0,
                RecommendedCrewSize    = dto.RecommendedCrewSize ?? 1,
                EstimatedDurationHours = dto.EstimatedDurationHours ?? 0,
                Confidence             = 0.98,
                Reason                 = dto.Reason ?? "Supervisor reviewed and customized estimate & materials.",
                ModelName              = "Supervisor Customized",
            };
            await _repo.AddCostEstimateAsync(estimate);

            // Update WorkOrder summary fields
            wo.EstimatedCost = dto.EstimatedCost;
            if (dto.EstimatedDurationHours.HasValue)
                wo.EstimatedDurationHours = (int)dto.EstimatedDurationHours.Value;
            if (dto.RecommendedCrewSize.HasValue)
                wo.RecommendedCrewSize = dto.RecommendedCrewSize.Value;

            // Check approval threshold or mandatory policy
            var requireAlways = _config.GetValue<bool>("WorkOrderSettings:RequireDirectorApprovalAlways", false);
            var threshold = _config.GetValue<decimal>("WorkOrderSettings:DirectorApprovalThreshold", 100000);
            if (requireAlways || threshold == 0m || dto.EstimatedCost > threshold)
            {
                wo.ApprovalRequired = true;
                wo.ApprovalStatus   = Models.ApprovalStatus.Pending;
                wo.Status           = WorkOrderStatus.PendingApproval;
            }

            await _repo.UpdateAsync(wo);
            return await MapToResponseDtoAsync(workOrderId);
        }

        // ── APPROVE / REJECT ──────────────────────────────────────────────────

        public async Task<WorkOrderResponseDto?> ApproveAsync(Guid id, string approvedByUserId, string? notes)
        {
            var wo = await _repo.GetByIdAsync(id);
            if (wo == null || wo.IsCancelled) return null;

            if (!WorkOrderStatus.CanTransition(wo.Status, WorkOrderStatus.Approved))
            {
                var allowed = WorkOrderStatus.GetAllowedNextStatuses(wo.Status);
                throw new InvalidOperationException(
                    $"Cannot approve work order in status '{wo.Status}'. Allowed next statuses: {(allowed.Length > 0 ? string.Join(", ", allowed) : "None")}.");
            }

            wo.ApprovalStatus = Models.ApprovalStatus.Approved;
            wo.Status         = WorkOrderStatus.Approved;
            if (notes != null) wo.Notes = (wo.Notes ?? "") + $"\n[APPROVED by {approvedByUserId}] {notes}";

            await _repo.UpdateAsync(wo);

            // Auto-dispatch maintenance record so work order is immediately active on field inspector portal
            await EnsureMaintenanceRecordDispatchedAsync(wo, approvedByUserId);

            return await MapToResponseDtoAsync(id);
        }

        public async Task<WorkOrderResponseDto?> RejectAsync(Guid id, string rejectedByUserId, string? notes)
        {
            var wo = await _repo.GetByIdAsync(id);
            if (wo == null || wo.IsCancelled) return null;

            if (!WorkOrderStatus.CanTransition(wo.Status, WorkOrderStatus.Rejected))
            {
                var allowed = WorkOrderStatus.GetAllowedNextStatuses(wo.Status);
                throw new InvalidOperationException(
                    $"Cannot reject work order in status '{wo.Status}'. Allowed next statuses: {(allowed.Length > 0 ? string.Join(", ", allowed) : "None")}.");
            }

            wo.ApprovalStatus = Models.ApprovalStatus.Rejected;
            wo.Status         = WorkOrderStatus.Rejected;
            if (notes != null) wo.Notes = (wo.Notes ?? "") + $"\n[REJECTED by {rejectedByUserId}] {notes}";

            await _repo.UpdateAsync(wo);
            return await MapToResponseDtoAsync(id);
        }

        private async Task EnsureMaintenanceRecordDispatchedAsync(WorkOrder wo, string dispatchedByUserId)
        {
            try
            {
                bool hasRecord = await _db.MaintenanceRecords.AnyAsync(m => m.WorkOrderId == wo.Id && !m.IsDeleted);
                if (!hasRecord)
                {
                    string workerEmail = !string.IsNullOrWhiteSpace(wo.AssignedCrew) && wo.AssignedCrew.Contains("@")
                        ? wo.AssignedCrew
                        : "worker@civilanka.gov.lk";

                    string maintenanceType = "Corrective";
                    if (wo.Hazard != null && !string.IsNullOrWhiteSpace(wo.Hazard.Category))
                    {
                        maintenanceType = wo.Hazard.Category;
                    }
                    else if (wo.HazardId.HasValue)
                    {
                        var hCat = await _db.Hazards.Where(h => h.Id == wo.HazardId.Value).Select(h => h.Category).FirstOrDefaultAsync();
                        if (!string.IsNullOrWhiteSpace(hCat)) maintenanceType = hCat;
                    }

                    var mRecord = new MaintenanceRecord
                    {
                        WorkOrderId        = wo.Id,
                        AssetId            = wo.AssetId,
                        PerformedBy        = workerEmail,
                        MaintenanceType    = maintenanceType,
                        Description        = wo.Title ?? wo.Description,
                        Status             = MaintenanceStatus.Assigned,
                        LabourHours        = wo.EstimatedDurationHours.HasValue && wo.EstimatedDurationHours.Value > 0
                            ? wo.EstimatedDurationHours.Value
                            : 4.0m,
                        ActualCost         = 0,
                        VerificationStatus = MaintenanceVerificationStatus.NotSubmitted,
                        CreatedAt          = DateTime.UtcNow,
                        UpdatedAt          = DateTime.UtcNow
                    };
                    _db.MaintenanceRecords.Add(mRecord);
                    await _db.SaveChangesAsync();

                    _db.MaintenanceAuditLogs.Add(new MaintenanceAuditLog
                    {
                        MaintenanceRecordId = mRecord.Id,
                        UserId              = string.IsNullOrWhiteSpace(dispatchedByUserId) ? "supervisor@civilanka.gov.lk" : dispatchedByUserId,
                        Action              = "INITIALIZE_MAINTENANCE",
                        EntityType          = "MaintenanceRecord",
                        EntityId            = mRecord.Id.ToString(),
                        PreviousStatus      = null,
                        NewStatus           = MaintenanceStatus.Assigned,
                        Description         = $"Work Order {wo.WorkOrderNumber} approved and automatically dispatched to field worker terminal ({workerEmail}).",
                        Timestamp           = DateTime.UtcNow
                    });
                    await _db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to auto-dispatch maintenance record for WorkOrder {Id}", wo.Id);
            }
        }

        public async Task<CostEstimateResponseDto?> GetLatestEstimateAsync(Guid workOrderId)
        {
            var estimate = await _repo.GetLatestCostEstimateAsync(workOrderId);
            return estimate == null ? null : MapCostEstimate(estimate);
        }

        // ── Mapping ───────────────────────────────────────────────────────────

        private async Task<WorkOrderResponseDto> MapToResponseDtoAsync(Guid id)
        {
            var wo       = await _repo.GetByIdAsync(id);
            var estimate = await _repo.GetLatestCostEstimateAsync(id);
            var analysis = await _repo.GetLatestAIAnalysisAsync(id);
            var items    = await _db.WorkOrderItems.Where(i => i.WorkOrderId == id).ToListAsync();
            return MapToDto(wo!, estimate, analysis, items);
        }

        private static WorkOrderResponseDto MapToDto(
            WorkOrder wo,
            CostEstimate? estimate,
            WorkOrderAIAnalysis? analysis,
            List<WorkOrderItem> items)
        {
            var latestHazardAnalysis = wo.Hazard?.AIAnalyses?.OrderByDescending(a => a.CreatedAt).FirstOrDefault();
            var latestInspection = wo.Asset?.Inspections?.OrderByDescending(i => i.InspectionDate).FirstOrDefault();

            return new WorkOrderResponseDto
            {
                Id                    = wo.Id,
                WorkOrderNumber       = wo.WorkOrderNumber,
                HazardId              = wo.HazardId,
                HazardTicket          = wo.Hazard?.TicketNumber,
                HazardCategory        = wo.Hazard?.Category,
                HazardDescription     = wo.Hazard?.Description,
                HazardSeverity        = wo.Hazard?.Severity ?? latestHazardAnalysis?.Severity,
                HazardPriority        = wo.Hazard?.Priority ?? latestHazardAnalysis?.Priority,
                HazardLatitude        = wo.Hazard?.Latitude,
                HazardLongitude       = wo.Hazard?.Longitude,
                HazardAddress         = wo.Hazard?.Address,
                AssetId               = wo.AssetId,
                AssetName             = wo.Asset?.Name,
                AssetType             = wo.Asset?.Type,
                AssetCondition        = latestInspection?.Condition,
                Title                 = wo.Title,
                Description           = wo.Description,
                Priority              = wo.Priority,
                Severity              = wo.Severity,
                EstimatedCost         = wo.EstimatedCost,
                ApprovedBudget        = wo.ApprovedBudget,
                ActualCost            = wo.ActualCost,
                EstimatedDurationHours = wo.EstimatedDurationHours,
                RecommendedCrewSize   = wo.RecommendedCrewSize,
                AssignedContractorId  = wo.AssignedContractorId,
                AssignedContractorName = wo.AssignedContractor?.Name,
                AssignedCrew          = wo.AssignedCrew,
                ScheduledDate         = wo.ScheduledDate,
                Status                = wo.Status,
                ApprovalStatus        = wo.ApprovalStatus,
                ApprovalRequired      = wo.ApprovalRequired,
                Notes                 = wo.Notes,
                CreatedBy             = wo.CreatedBy,
                CreatedAt             = wo.CreatedAt,
                UpdatedAt             = wo.UpdatedAt,
                IsCancelled           = wo.IsCancelled,
                Items                 = items.Select(i => new WorkOrderItemResponseDto
                {
                    Id                 = i.Id,
                    ItemType           = i.ItemType,
                    ItemName           = i.ItemName,
                    Quantity           = i.Quantity,
                    Unit               = i.Unit,
                    EstimatedUnitCost  = i.EstimatedUnitCost,
                    EstimatedTotalCost = i.EstimatedTotalCost,
                }).ToList(),
                LatestCostEstimate    = estimate == null ? null : MapCostEstimate(estimate),
                LatestAIAnalysis      = analysis == null ? null : new WorkOrderAIAnalysisResponseDto
                {
                    Id             = analysis.Id,
                    AgentName      = analysis.AgentName,
                    EstimatedCost  = analysis.EstimatedCost,
                    Recommendation = analysis.Recommendation,
                    Reason         = analysis.Reason,
                    Confidence     = analysis.Confidence,
                    CreatedAt      = analysis.CreatedAt,
                }
            };
        }

        private static CostEstimateResponseDto MapCostEstimate(CostEstimate e) => new()
        {
            Id                    = e.Id,
            EstimatedCost         = e.EstimatedCost,
            Currency              = e.Currency,
            MaterialCost          = e.MaterialCost,
            LabourCost            = e.LabourCost,
            EquipmentCost         = e.EquipmentCost,
            EstimatedLabourHours  = e.EstimatedLabourHours,
            RecommendedCrewSize   = e.RecommendedCrewSize,
            EstimatedDurationHours = e.EstimatedDurationHours,
            Confidence            = e.Confidence,
            Reason                = e.Reason,
            ModelName             = e.ModelName,
            CreatedAt             = e.CreatedAt,
        };
    }
}
