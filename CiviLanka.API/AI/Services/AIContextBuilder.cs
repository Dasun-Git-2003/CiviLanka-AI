using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using CiviLanka.API.Data;
using CiviLanka.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.AI.Services
{
    public class AIContextBuilder : IAIContextBuilder
    {
        private readonly AppDbContext _db;

        public AIContextBuilder(AppDbContext db)
        {
            _db = db;
        }

        public async Task<HazardClassificationInput> BuildHazardContextAsync(Guid hazardId)
        {
            var hazard = await _db.Hazards
                .AsNoTracking()
                .FirstOrDefaultAsync(h => h.Id == hazardId);

            if (hazard == null)
            {
                throw new KeyNotFoundException($"Hazard with ID {hazardId} not found in database.");
            }

            var input = new HazardClassificationInput
            {
                HazardId = hazard.Id,
                TicketNumber = hazard.TicketNumber,
                CategorySupplied = hazard.Category,
                Description = hazard.Description,
                Address = hazard.Address,
                Latitude = hazard.Latitude,
                Longitude = hazard.Longitude,
                ImageUrl = hazard.ImageUrl
            };

            // Query nearby hazards within coordinate window (+- 0.01 deg ~= 1.1km)
            if (hazard.Latitude.HasValue && hazard.Longitude.HasValue)
            {
                var lat = hazard.Latitude.Value;
                var lon = hazard.Longitude.Value;

                var nearby = await _db.Hazards
                    .AsNoTracking()
                    .Where(h => h.Id != hazard.Id &&
                                h.Latitude.HasValue && h.Longitude.HasValue &&
                                Math.Abs(h.Latitude.Value - lat) < 0.015 &&
                                Math.Abs(h.Longitude.Value - lon) < 0.015)
                    .OrderByDescending(h => h.CreatedAt)
                    .Take(5)
                    .Select(h => $"{h.Category} ({h.Severity ?? "Unassessed"}) at {h.Address ?? "Nearby"} ({h.CreatedAt:yyyy-MM-dd})")
                    .ToListAsync();

                input.NearbyHazardsSummary = nearby;

                // Find closest infrastructure asset
                var closestAsset = await _db.InfrastructureAssets
                    .AsNoTracking()
                    .Where(a => Math.Abs(a.Latitude - lat) < 0.02 && Math.Abs(a.Longitude - lon) < 0.02)
                    .Select(a => $"{a.Id} ({a.Name}, Type: {a.Type}, Status: {a.Status}) at {a.Location}")
                    .FirstOrDefaultAsync();

                input.RelatedAssetSummary = closestAsset;
            }

            // Historical incidents of the same category
            var history = await _db.Hazards
                .AsNoTracking()
                .Where(h => h.Id != hazard.Id && h.Category == hazard.Category)
                .OrderByDescending(h => h.CreatedAt)
                .Take(3)
                .Select(h => $"{h.TicketNumber}: {h.Severity} severity, resolved in {h.Status}")
                .ToListAsync();

            input.HistoricalIncidentsSummary = history;

            return input;
        }

        public async Task<AssetRiskInput> BuildAssetRiskContextAsync(string assetId)
        {
            var asset = await _db.InfrastructureAssets
                .AsNoTracking()
                .Include(a => a.Inspections)
                .FirstOrDefaultAsync(a => a.Id == assetId);

            if (asset == null)
            {
                throw new KeyNotFoundException($"Infrastructure asset with ID {assetId} not found in database.");
            }

            int? ageYears = null;
            if (asset.InstallationDate.HasValue)
            {
                ageYears = (int)((DateTime.UtcNow - asset.InstallationDate.Value).TotalDays / 365.25);
            }

            var input = new AssetRiskInput
            {
                AssetId = asset.Id,
                Name = asset.Name,
                Type = asset.Type,
                Status = asset.Status,
                Location = asset.Location,
                InstallationDate = asset.InstallationDate,
                AgeYears = ageYears,
                Description = asset.Description
            };

            // Inspections
            input.RecentInspections = asset.Inspections
                .OrderByDescending(i => i.InspectionDate)
                .Take(5)
                .Select(i => $"{i.InspectionDate:yyyy-MM-dd}: {i.Condition} condition - {i.IssuesFound ?? "No issues reported"}")
                .ToList();

            // Previous work orders / maintenance on this asset
            var workOrders = await _db.WorkOrders
                .AsNoTracking()
                .Where(w => w.AssetId == asset.Id)
                .OrderByDescending(w => w.CreatedAt)
                .Take(5)
                .Select(w => $"{w.WorkOrderNumber} ({w.Status}): {w.Title}, Cost: LKR {w.ActualCost:N0}")
                .ToListAsync();

            input.MaintenanceHistory = workOrders;

            // Related citizen hazards near this asset
            if (asset.Latitude != 0 && asset.Longitude != 0)
            {
                var relatedHazards = await _db.Hazards
                    .AsNoTracking()
                    .Where(h => h.Latitude.HasValue && h.Longitude.HasValue &&
                                Math.Abs(h.Latitude.Value - asset.Latitude) < 0.01 &&
                                Math.Abs(h.Longitude.Value - asset.Longitude) < 0.01)
                    .OrderByDescending(h => h.CreatedAt)
                    .Take(5)
                    .Select(h => $"{h.TicketNumber} ({h.Category}, {h.Status})")
                    .ToListAsync();

                input.RelatedHazards = relatedHazards;
                input.IncidentCount = relatedHazards.Count;
            }

            return input;
        }

        public async Task<CostEstimateInput> BuildCostEstimateContextAsync(Guid workOrderId)
        {
            var workOrder = await _db.WorkOrders
                .AsNoTracking()
                .Include(w => w.Hazard)
                .Include(w => w.Items)
                .FirstOrDefaultAsync(w => w.Id == workOrderId);

            if (workOrder == null)
            {
                throw new KeyNotFoundException($"Work order with ID {workOrderId} not found in database.");
            }

            var input = new CostEstimateInput
            {
                WorkOrderId = workOrder.Id,
                WorkOrderNumber = workOrder.WorkOrderNumber,
                HazardId = workOrder.HazardId,
                HazardCategory = workOrder.Hazard?.Category ?? "Civil Infrastructure",
                HazardSeverity = workOrder.Hazard?.Severity ?? "MEDIUM",
                WorkDescription = workOrder.Description,
                Location = workOrder.Hazard?.Address ?? "Municipal Work Area",
                AssetId = workOrder.AssetId
            };

            if (!string.IsNullOrWhiteSpace(workOrder.AssetId))
            {
                var asset = await _db.InfrastructureAssets.AsNoTracking().FirstOrDefaultAsync(a => a.Id == workOrder.AssetId);
                if (asset != null)
                {
                    input.AssetType = asset.Type;
                    var lastInspection = await _db.AssetInspections
                        .AsNoTracking()
                        .Where(i => i.AssetId == asset.Id)
                        .OrderByDescending(i => i.InspectionDate)
                        .FirstOrDefaultAsync();

                    input.AssetCondition = lastInspection?.Condition ?? "Satisfactory";
                }
            }

            // Historical material rates from database WorkOrderItems
            var dbRates = await _db.WorkOrderItems
                .AsNoTracking()
                .Where(item => item.EstimatedUnitCost > 0)
                .OrderByDescending(item => item.Id)
                .Take(20)
                .Select(item => new HistoricalMaterialRate
                {
                    Name = item.ItemName,
                    UnitCost = item.EstimatedUnitCost,
                    Unit = item.Unit
                })
                .ToListAsync();

            if (dbRates.Count > 0)
            {
                input.HistoricalMaterialRates = dbRates;
            }
            else
            {
                // Baseline Sri Lankan municipal construction benchmarks
                input.HistoricalMaterialRates = new List<HistoricalMaterialRate>
                {
                    new HistoricalMaterialRate { Name = "Asphalt Cold Mix Premix", UnitCost = 28000, Unit = "tons" },
                    new HistoricalMaterialRate { Name = "Ready-Mix Concrete C25/30", UnitCost = 36000, Unit = "m3" },
                    new HistoricalMaterialRate { Name = "Aggregate Sub-Base ABC", UnitCost = 14000, Unit = "m3" },
                    new HistoricalMaterialRate { Name = "PVC Pressure Pipe 110mm", UnitCost = 8500, Unit = "meters" },
                    new HistoricalMaterialRate { Name = "High-Intensity LED Luminaire", UnitCost = 18500, Unit = "units" }
                };
            }

            // Previous similar completed work orders
            var similar = await _db.WorkOrders
                .AsNoTracking()
                .Where(w => w.Id != workOrder.Id && w.Status == "Completed" && w.ActualCost > 0)
                .OrderByDescending(w => w.CreatedAt)
                .Take(3)
                .Select(w => $"{w.WorkOrderNumber} ({w.Title}): Estimated LKR {w.EstimatedCost:N0}, Actual LKR {w.ActualCost:N0}")
                .ToListAsync();

            input.PreviousSimilarWorkOrders = similar;

            return input;
        }

        public async Task<SafetyComplianceInput> BuildSafetyComplianceContextAsync(Guid maintenanceRecordId, string stage = "BeforeMaintenance")
        {
            var record = await _db.MaintenanceRecords
                .AsNoTracking()
                .Include(r => r.WorkOrder)
                    .ThenInclude(w => w!.Hazard)
                .FirstOrDefaultAsync(r => r.Id == maintenanceRecordId);

            if (record == null)
            {
                throw new KeyNotFoundException($"Maintenance record with ID {maintenanceRecordId} not found in database.");
            }

            var input = new SafetyComplianceInput
            {
                MaintenanceRecordId = record.Id,
                WorkOrderId = record.WorkOrderId,
                WorkOrderNumber = record.WorkOrder?.WorkOrderNumber,
                Title = record.WorkOrder?.Title ?? "Municipal Maintenance",
                Description = record.WorkOrder?.Description ?? "Field execution",
                HazardCategory = record.WorkOrder?.Hazard?.Category,
                Severity = record.WorkOrder?.Hazard?.Severity,
                Location = record.WorkOrder?.Hazard?.Address ?? "Municipal Job Site",
                MaintenanceType = record.MaintenanceType,
                MaterialsUsed = record.MaterialsUsed,
                EquipmentUsed = record.EquipmentUsed,
                LabourHours = record.LabourHours,
                SafetyChecklist = record.SafetyChecklist,
                WorkerNotes = record.WorkerNotes,
                CompletionNotes = record.CompletionNotes,
                HasBeforeImage = !string.IsNullOrWhiteSpace(record.BeforeImageUrl),
                HasAfterImage = !string.IsNullOrWhiteSpace(record.AfterImageUrl),
                AssetId = record.WorkOrder?.AssetId,
                Stage = stage
            };

            if (!string.IsNullOrWhiteSpace(record.WorkOrder?.AssetId))
            {
                var asset = await _db.InfrastructureAssets.AsNoTracking().FirstOrDefaultAsync(a => a.Id == record.WorkOrder.AssetId);
                if (asset != null)
                {
                    input.AssetType = asset.Type;
                    var lastInspection = await _db.AssetInspections
                        .AsNoTracking()
                        .Where(i => i.AssetId == asset.Id)
                        .OrderByDescending(i => i.InspectionDate)
                        .FirstOrDefaultAsync();

                    input.AssetCondition = lastInspection?.Condition ?? "Moderate";
                }
            }

            return input;
        }

        public async Task<DispatchPriorityInput> BuildDispatchPriorityContextAsync(List<Guid>? hazardIds, string? corridor = null, string? specialization = null)
        {
            var query = _db.Hazards.AsNoTracking().AsQueryable();

            if (hazardIds != null && hazardIds.Count > 0)
            {
                query = query.Where(h => hazardIds.Contains(h.Id));
            }
            else
            {
                query = query.Where(h => h.Status != HazardStatus.Resolved && !h.IsCancelled)
                             .OrderByDescending(h => h.Priority == "URGENT" ? 3 : h.Priority == "HIGH" ? 2 : 1)
                             .ThenByDescending(h => h.CreatedAt)
                             .Take(10);
            }

            var hazards = await query.ToListAsync();

            var hazardItems = hazards.Select(h => new HazardDispatchItemContext
            {
                HazardId = h.Id,
                TicketNumber = h.TicketNumber,
                Category = h.Category,
                Severity = h.Severity ?? "MEDIUM",
                Priority = h.Priority ?? "NORMAL",
                Latitude = h.Latitude,
                Longitude = h.Longitude,
                Address = h.Address ?? "Municipal Road",
                ReportedAt = h.CreatedAt,
                NearbyCorridor = corridor ?? ExtractCorridor(h.Address)
            }).ToList();

            // Fetch contractors
            var contractorsQuery = _db.Contractors.AsNoTracking().AsQueryable();
            if (!string.IsNullOrWhiteSpace(specialization))
            {
                contractorsQuery = contractorsQuery.Where(c => c.Specialization.Contains(specialization));
            }

            var contractors = await contractorsQuery
                .OrderByDescending(c => c.IsAvailable)
                .ThenByDescending(c => c.Rating)
                .Take(8)
                .Select(c => new ContractorDispatchContext
                {
                    ContractorId = c.Id,
                    Name = c.Name,
                    Specialization = c.Specialization,
                    Location = c.Location,
                    Rating = c.Rating,
                    IsAvailable = c.IsAvailable,
                    ActiveJobs = c.JobCount
                })
                .ToListAsync();

            return new DispatchPriorityInput
            {
                HazardIds = hazards.Select(h => h.Id).ToList(),
                TargetCorridor = corridor,
                PreferredSpecialization = specialization,
                Hazards = hazardItems,
                AvailableContractors = contractors
            };
        }

        public async Task<MunicipalSafetyAuditInput> BuildMunicipalSafetyAuditContextAsync(Guid workOrderId)
        {
            var workOrder = await _db.WorkOrders
                .AsNoTracking()
                .Include(w => w.Hazard)
                .Include(w => w.Asset)
                .FirstOrDefaultAsync(w => w.Id == workOrderId);

            if (workOrder == null)
            {
                throw new KeyNotFoundException($"Work order with ID {workOrderId} not found in database.");
            }

            // Find associated maintenance record if one exists
            var record = await _db.MaintenanceRecords
                .AsNoTracking()
                .Where(m => m.WorkOrderId == workOrderId)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            double? woLat = workOrder.Hazard?.Latitude ?? workOrder.Asset?.Latitude;
            double? woLng = workOrder.Hazard?.Longitude ?? workOrder.Asset?.Longitude;

            double? execLat = woLat; // Default to site coordinates if field device did not supply alternate
            double? execLng = woLng;
            double? deltaMeters = 0;

            if (record != null)
            {
                // If coordinates are stored or if delta can be measured
                deltaMeters = (woLat.HasValue && woLng.HasValue && execLat.HasValue && execLng.HasValue)
                    ? CalculateDistanceMeters(woLat.Value, woLng.Value, execLat.Value, execLng.Value)
                    : null;
            }

            return new MunicipalSafetyAuditInput
            {
                WorkOrderId = workOrder.Id,
                WorkOrderNumber = workOrder.WorkOrderNumber,
                Title = workOrder.Title,
                Priority = workOrder.Priority,
                Severity = workOrder.Severity ?? "MEDIUM",
                EstimatedCost = workOrder.EstimatedCost ?? 0m,
                ActualCost = workOrder.ActualCost,
                ApprovalStatus = workOrder.ApprovalStatus,
                ApprovalRequired = workOrder.ApprovalRequired,
                WorkOrderStatus = workOrder.Status,
                WorkOrderLatitude = woLat,
                WorkOrderLongitude = woLng,
                MaintenanceRecordId = record?.Id,
                PerformedBy = record?.PerformedBy ?? workOrder.AssignedCrew,
                MaintenanceType = record?.MaintenanceType ?? "Corrective",
                HasBeforeImage = record != null && !string.IsNullOrWhiteSpace(record.BeforeImageUrl),
                BeforeImageUrl = record?.BeforeImageUrl,
                HasAfterImage = record != null && !string.IsNullOrWhiteSpace(record.AfterImageUrl),
                AfterImageUrl = record?.AfterImageUrl,
                SafetyChecklist = record?.SafetyChecklist,
                VerificationStatus = record?.VerificationStatus,
                ExecutionLatitude = execLat,
                ExecutionLongitude = execLng,
                GpsDistanceDeltaMeters = deltaMeters
            };
        }

        private static string ExtractCorridor(string? address)
        {
            if (string.IsNullOrWhiteSpace(address)) return "Colombo Central";
            if (address.Contains("Galle", StringComparison.OrdinalIgnoreCase)) return "Galle Road Corridor";
            if (address.Contains("Baseline", StringComparison.OrdinalIgnoreCase)) return "Baseline Road Corridor";
            if (address.Contains("Kandy", StringComparison.OrdinalIgnoreCase)) return "Kandy Road Corridor";
            if (address.Contains("High Level", StringComparison.OrdinalIgnoreCase)) return "High Level Road Corridor";
            return "Colombo Metro Corridor";
        }

        private static double CalculateDistanceMeters(double lat1, double lon1, double lat2, double lon2)
        {
            const double R = 6371000;
            var dLat = (lat2 - lat1) * (Math.PI / 180.0);
            var dLon = (lon2 - lon1) * (Math.PI / 180.0);
            var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                    Math.Cos(lat1 * (Math.PI / 180.0)) * Math.Cos(lat2 * (Math.PI / 180.0)) *
                    Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
            var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return Math.Round(R * c, 1);
        }
    }
}
