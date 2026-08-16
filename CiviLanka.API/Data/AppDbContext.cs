using CiviLanka.API.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CiviLanka.API.Data
{
    /// <summary>
    /// Shared application database context for all team members.
    /// Member 1 owns: Hazards, HazardAIAnalyses.
    /// Other members should add their DbSet entries here.
    /// </summary>
    public class AppDbContext : IdentityDbContext<ApplicationUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // ── Member 1 ────────────────────────────────────────────────────────────
        public DbSet<Hazard> Hazards { get; set; }
        public DbSet<HazardAIAnalysis> HazardAIAnalyses { get; set; }

        // ── Member 2 – add InfrastructureAssets, Contractors etc. here ──────────
        // public DbSet<InfrastructureAsset> InfrastructureAssets { get; set; }

        // ── Member 3 – add WorkOrders etc. here ─────────────────────────────────
        // public DbSet<WorkOrder> WorkOrders { get; set; }

        // ── Member 4 – add BudgetLogs, AuditRecords etc. here ───────────────────
        // public DbSet<BudgetLog> BudgetLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // ── Hazard ──────────────────────────────────────────────────────────
            builder.Entity<Hazard>(entity =>
            {
                entity.HasKey(h => h.Id);

                entity.HasIndex(h => h.TicketNumber).IsUnique();
                entity.HasIndex(h => h.CitizenId);
                entity.HasIndex(h => h.Status);
                entity.HasIndex(h => new { h.Latitude, h.Longitude });

                entity.Property(h => h.TicketNumber).IsRequired().HasMaxLength(20);
                entity.Property(h => h.Category).IsRequired().HasMaxLength(50);
                entity.Property(h => h.Description).IsRequired();
                entity.Property(h => h.Status).IsRequired().HasMaxLength(30).HasDefaultValue(HazardStatus.Submitted);
                entity.Property(h => h.IsCancelled).HasDefaultValue(false);

                entity.HasOne(h => h.Citizen)
                      .WithMany(u => u.Hazards)
                      .HasForeignKey(h => h.CitizenId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(h => h.AIAnalyses)
                      .WithOne(a => a.Hazard)
                      .HasForeignKey(a => a.HazardId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // ── HazardAIAnalysis ────────────────────────────────────────────────
            builder.Entity<HazardAIAnalysis>(entity =>
            {
                entity.HasKey(a => a.Id);
                entity.HasIndex(a => a.HazardId);
                entity.Property(a => a.Severity).IsRequired().HasMaxLength(20);
                entity.Property(a => a.RiskLevel).IsRequired().HasMaxLength(20);
                entity.Property(a => a.Priority).IsRequired().HasMaxLength(20);
                entity.Property(a => a.ModelName).HasMaxLength(100);
            });
        }
    }
}
