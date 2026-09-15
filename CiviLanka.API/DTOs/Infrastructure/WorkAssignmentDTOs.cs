using System.ComponentModel.DataAnnotations;

namespace CiviLanka.API.DTOs.Infrastructure
{
    public class CreateWorkAssignmentDto
    {
        [Required(ErrorMessage = "ContractorId is required")]
        public int ContractorId { get; set; }

        [MaxLength(20)]
        public string? AssetId { get; set; }

        [Required(ErrorMessage = "Asset name is required")]
        [MaxLength(150)]
        public string AssetName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Asset type is required")]
        [MaxLength(50)]
        public string AssetType { get; set; } = "Water";

        [Required(ErrorMessage = "Priority is required")]
        [RegularExpression("^(Low|Medium|High|Critical)$", ErrorMessage = "Priority must be Low, Medium, High, or Critical")]
        public string Priority { get; set; } = "Medium";

        [Required(ErrorMessage = "Due date is required")]
        public DateTime DueDate { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }

        public decimal? EstimatedCost { get; set; }
    }

    public class UpdateAssignmentStatusDto
    {
        [Required(ErrorMessage = "Status is required")]
        [RegularExpression("^(Pending|InProgress|Done|Cancelled)$", ErrorMessage = "Status must be Pending, InProgress, Done, or Cancelled")]
        public string Status { get; set; } = "InProgress";

        public decimal? ActualCost { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class WorkAssignmentResponseDto
    {
        public int Id { get; set; }
        public int ContractorId { get; set; }
        public string? ContractorName { get; set; }
        public string? AssetId { get; set; }
        public string AssetName { get; set; } = string.Empty;
        public string AssetType { get; set; } = string.Empty;
        public string Priority { get; set; } = string.Empty;
        public DateTime DueDate { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal? EstimatedCost { get; set; }
        public decimal? ActualCost { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }
}

