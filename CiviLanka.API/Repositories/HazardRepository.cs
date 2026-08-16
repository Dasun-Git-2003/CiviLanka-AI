using CiviLanka.API.Data;
using CiviLanka.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Repositories
{
    public interface IHazardRepository
    {
        Task<Hazard?> GetByIdAsync(Guid id);
        Task<Hazard?> GetByIdWithAnalysesAsync(Guid id);
        Task<List<Hazard>> GetByCitizenIdAsync(string citizenId);
        Task<List<Hazard>> GetAllActiveAsync();
        Task<Hazard> CreateAsync(Hazard hazard);
        Task<Hazard> UpdateAsync(Hazard hazard);
        Task<int> GetNextSequenceAsync();
        Task<HazardAIAnalysis> AddAnalysisAsync(HazardAIAnalysis analysis);
        Task<HazardAIAnalysis?> GetLatestAnalysisAsync(Guid hazardId);
        Task<List<HazardAIAnalysis>> GetAllAnalysesAsync(Guid hazardId);
    }

    public class HazardRepository : IHazardRepository
    {
        private readonly AppDbContext _db;

        public HazardRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<Hazard?> GetByIdAsync(Guid id)
        {
            return await _db.Hazards
                .Include(h => h.Citizen)
                .FirstOrDefaultAsync(h => h.Id == id);
        }

        public async Task<Hazard?> GetByIdWithAnalysesAsync(Guid id)
        {
            return await _db.Hazards
                .Include(h => h.Citizen)
                .Include(h => h.AIAnalyses.OrderByDescending(a => a.CreatedAt))
                .FirstOrDefaultAsync(h => h.Id == id);
        }

        public async Task<List<Hazard>> GetByCitizenIdAsync(string citizenId)
        {
            return await _db.Hazards
                .Include(h => h.AIAnalyses.OrderByDescending(a => a.CreatedAt).Take(1))
                .Where(h => h.CitizenId == citizenId)
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync();
        }

        public async Task<List<Hazard>> GetAllActiveAsync()
        {
            return await _db.Hazards
                .Include(h => h.Citizen)
                .Include(h => h.AIAnalyses.OrderByDescending(a => a.CreatedAt).Take(1))
                .Where(h => !h.IsCancelled)
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync();
        }

        public async Task<Hazard> CreateAsync(Hazard hazard)
        {
            _db.Hazards.Add(hazard);
            await _db.SaveChangesAsync();
            return hazard;
        }

        public async Task<Hazard> UpdateAsync(Hazard hazard)
        {
            hazard.UpdatedAt = DateTime.UtcNow;
            _db.Hazards.Update(hazard);
            await _db.SaveChangesAsync();
            return hazard;
        }

        public async Task<int> GetNextSequenceAsync()
        {
            // Count total hazards (including cancelled) for unique ticket numbering
            return await _db.Hazards.CountAsync() + 1;
        }

        public async Task<HazardAIAnalysis> AddAnalysisAsync(HazardAIAnalysis analysis)
        {
            _db.HazardAIAnalyses.Add(analysis);
            await _db.SaveChangesAsync();
            return analysis;
        }

        public async Task<HazardAIAnalysis?> GetLatestAnalysisAsync(Guid hazardId)
        {
            return await _db.HazardAIAnalyses
                .Where(a => a.HazardId == hazardId)
                .OrderByDescending(a => a.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<List<HazardAIAnalysis>> GetAllAnalysesAsync(Guid hazardId)
        {
            return await _db.HazardAIAnalyses
                .Where(a => a.HazardId == hazardId)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }
    }
}
