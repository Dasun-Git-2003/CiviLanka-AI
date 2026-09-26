using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CiviLanka.API.Models
{
    /// <summary>
    /// Immutable municipal operational audit log for tracking maintenance and verification events.
    /// </summary>
    public class MaintenanceAuditLog
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid MaintenanceRecordId { get; set; }

        [ForeignKey(nameof(MaintenanceRecordId))]
        public MaintenanceRecord? MaintenanceRecord { get; set; }

        [Required]
        [MaxLength(100)]
        public string UserId { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Action { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string EntityType { get; set; } = "MaintenanceRecord";

        [Required]
        [MaxLength(100)]
        public string EntityId { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [MaxLength(50)]
        public string? PreviousStatus { get; set; }

        [MaxLength(50)]
        public string? NewStatus { get; set; }

        [MaxLength(2000)]
        public string Description { get; set; } = string.Empty;
    }
}
