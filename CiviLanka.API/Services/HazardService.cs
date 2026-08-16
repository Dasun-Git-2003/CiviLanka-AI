using CiviLanka.API.Agents;
using CiviLanka.API.DTOs.Hazards;
using CiviLanka.API.Models;
using CiviLanka.API.Repositories;
using CiviLanka.API.Services;

namespace CiviLanka.API.Services
{
    public interface IHazardService
    {
        Task<HazardResponseDto> CreateHazardAsync(string citizenId, CreateHazardDto dto);
        Task<HazardResponseDto?> GetHazardByIdAsync(Guid id, string requestingUserId, string requestingUserRole);
        Task<List<HazardResponseDto>> GetMyCitizenHazardsAsync(string citizenId);
        Task<List<HazardResponseDto>> GetAllHazardsAsync();
        Task<HazardResponseDto?> UpdateHazardAsync(Guid id, string citizenId, UpdateHazardDto dto);
        Task<bool> CancelHazardAsync(Guid id, string citizenId);
        Task<HazardAIAnalysisResponseDto?> TriggerAnalysisAsync(Guid hazardId);
        Task<HazardAIAnalysisResponseDto?> GetLatestAnalysisAsync(Guid hazardId);
    }

    public class HazardService : IHazardService
    {
        private readonly IHazardRepository _repo;
        private readonly IGeocodingService _geocoding;
        private readonly IHazardClassificationAgent _agent;
        private readonly ILogger<HazardService> _logger;

        public HazardService(
            IHazardRepository repo,
            IGeocodingService geocoding,
            IHazardClassificationAgent agent,
            ILogger<HazardService> logger)
        {
            _repo = repo;
            _geocoding = geocoding;
            _agent = agent;
            _logger = logger;
        }

        public async Task<HazardResponseDto> CreateHazardAsync(string citizenId, CreateHazardDto dto)
        {
            // Generate ticket number: CG-{YYYY}-{NNNNN}
            var seq = await _repo.GetNextSequenceAsync();
            var ticket = $"CG-{DateTime.UtcNow.Year}-{seq:D5}";

            // Reverse-geocode address if coordinates provided
            string? address = null;
            if (dto.Latitude.HasValue && dto.Longitude.HasValue)
                address = await _geocoding.ReverseGeocodeAsync(dto.Latitude.Value, dto.Longitude.Value);

            var hazard = new Hazard
            {
                TicketNumber = ticket,
                CitizenId = citizenId,
                Category = dto.Category,
                Description = dto.Description,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                Address = address,
                ImageUrl = dto.ImageUrl,
                Status = HazardStatus.PendingAIAnalysis
            };

            var created = await _repo.CreateAsync(hazard);
            _logger.LogInformation("Hazard {Ticket} created by citizen {CitizenId}", ticket, citizenId);

            // Fire-and-forget AI analysis (runs in background)
            _ = Task.Run(async () =>
            {
                try { await RunAnalysisAsync(created.Id); }
                catch (Exception ex) { _logger.LogError(ex, "Background AI analysis failed for {HazardId}", created.Id); }
            });

            return await MapToResponseAsync(created);
        }

        public async Task<HazardResponseDto?> GetHazardByIdAsync(Guid id, string requestingUserId, string requestingUserRole)
        {
            var hazard = await _repo.GetByIdWithAnalysesAsync(id);
            if (hazard == null || hazard.IsCancelled) return null;

            // Citizens can only see their own hazards
            if (requestingUserRole == "Citizen" && hazard.CitizenId != requestingUserId)
                return null; // Caller treats null as 403

            return await MapToResponseAsync(hazard);
        }

        public async Task<List<HazardResponseDto>> GetMyCitizenHazardsAsync(string citizenId)
        {
            var hazards = await _repo.GetByCitizenIdAsync(citizenId);
            var results = new List<HazardResponseDto>();
            foreach (var h in hazards)
                results.Add(await MapToResponseAsync(h));
            return results;
        }

        public async Task<List<HazardResponseDto>> GetAllHazardsAsync()
        {
            var hazards = await _repo.GetAllActiveAsync();
            var results = new List<HazardResponseDto>();
            foreach (var h in hazards)
                results.Add(await MapToResponseAsync(h));
            return results;
        }

        public async Task<HazardResponseDto?> UpdateHazardAsync(Guid id, string citizenId, UpdateHazardDto dto)
        {
            var hazard = await _repo.GetByIdAsync(id);
            if (hazard == null || hazard.IsCancelled) return null;

            // Ownership check
            if (hazard.CitizenId != citizenId) return null;

            // Only allow editing in early states
            if (!HazardStatus.EditableStates.Contains(hazard.Status))
                return null;

            if (dto.Category != null && HazardCategory.All.Contains(dto.Category))
                hazard.Category = dto.Category;

            if (dto.Description != null) hazard.Description = dto.Description;
            if (dto.Latitude.HasValue) hazard.Latitude = dto.Latitude;
            if (dto.Longitude.HasValue) hazard.Longitude = dto.Longitude;
            if (dto.ImageUrl != null) hazard.ImageUrl = dto.ImageUrl;

            // Re-geocode if coordinates changed
            if ((dto.Latitude.HasValue || dto.Longitude.HasValue) &&
                hazard.Latitude.HasValue && hazard.Longitude.HasValue)
            {
                hazard.Address = await _geocoding.ReverseGeocodeAsync(
                    hazard.Latitude.Value, hazard.Longitude.Value);
            }

            var updated = await _repo.UpdateAsync(hazard);
            return await MapToResponseAsync(updated);
        }

        public async Task<bool> CancelHazardAsync(Guid id, string citizenId)
        {
            var hazard = await _repo.GetByIdAsync(id);
            if (hazard == null || hazard.IsCancelled) return false;
            if (hazard.CitizenId != citizenId) return false;

            // Only allow cancellation in early states
            if (!HazardStatus.EditableStates.Contains(hazard.Status)) return false;

            hazard.IsCancelled = true;
            hazard.Status = HazardStatus.Cancelled;
            await _repo.UpdateAsync(hazard);

            _logger.LogInformation("Hazard {Id} soft-cancelled by citizen {CitizenId}", id, citizenId);
            return true;
        }

        public async Task<HazardAIAnalysisResponseDto?> TriggerAnalysisAsync(Guid hazardId)
        {
            return await RunAnalysisAsync(hazardId);
        }

        public async Task<HazardAIAnalysisResponseDto?> GetLatestAnalysisAsync(Guid hazardId)
        {
            var analysis = await _repo.GetLatestAnalysisAsync(hazardId);
            return analysis == null ? null : MapAnalysis(analysis);
        }

        // ── Private Helpers ─────────────────────────────────────────────────────

        private async Task<HazardAIAnalysisResponseDto?> RunAnalysisAsync(Guid hazardId)
        {
            var hazard = await _repo.GetByIdAsync(hazardId);
            if (hazard == null) return null;

            try
            {
                var result = await _agent.ClassifyAsync(hazard);
                if (result == null) return null;

                await _repo.AddAnalysisAsync(result);

                // Update hazard with AI results
                hazard.Severity = result.Severity;
                hazard.RiskLevel = result.RiskLevel;
                hazard.Priority = result.Priority;
                hazard.Status = HazardStatus.AnalysisComplete;
                await _repo.UpdateAsync(hazard);

                _logger.LogInformation(
                    "Hazard {Id} classified: Severity={Severity}, Priority={Priority}",
                    hazardId, result.Severity, result.Priority);

                return MapAnalysis(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AI analysis failed for hazard {Id}", hazardId);
                hazard.Status = HazardStatus.Submitted; // Revert so citizen can re-submit
                await _repo.UpdateAsync(hazard);
                return null;
            }
        }

        private async Task<HazardResponseDto> MapToResponseAsync(Hazard hazard)
        {
            var latestAnalysis = hazard.AIAnalyses?.OrderByDescending(a => a.CreatedAt).FirstOrDefault()
                ?? await _repo.GetLatestAnalysisAsync(hazard.Id);

            return new HazardResponseDto
            {
                Id = hazard.Id,
                TicketNumber = hazard.TicketNumber,
                CitizenId = hazard.CitizenId,
                CitizenName = hazard.Citizen?.FullName ?? "",
                Category = hazard.Category,
                Description = hazard.Description,
                Latitude = hazard.Latitude,
                Longitude = hazard.Longitude,
                Address = hazard.Address,
                ImageUrl = hazard.ImageUrl,
                Status = hazard.Status,
                Severity = hazard.Severity,
                RiskLevel = hazard.RiskLevel,
                Priority = hazard.Priority,
                CreatedAt = hazard.CreatedAt,
                UpdatedAt = hazard.UpdatedAt,
                IsCancelled = hazard.IsCancelled,
                LatestAIAnalysis = latestAnalysis == null ? null : MapAnalysis(latestAnalysis)
            };
        }

        private static HazardAIAnalysisResponseDto MapAnalysis(HazardAIAnalysis a) => new()
        {
            Id = a.Id,
            Category = a.Category,
            Severity = a.Severity,
            RiskLevel = a.RiskLevel,
            Priority = a.Priority,
            Confidence = a.Confidence,
            Reason = a.Reason,
            ModelName = a.ModelName,
            CreatedAt = a.CreatedAt
        };
    }
}
