using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CiviLanka.API.Models
{
    /// <summary>
    /// A line item within a work order — represents a material, labour entry, or equipment.
    /// Created by the AI Cost Estimator Agent and validated by the backend before saving.
    /// </summary>
    public class WorkOrderItem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid WorkOrderId { get; set; }

        [ForeignKey(nameof(WorkOrderId))]
        public WorkOrder? WorkOrder { get; set; }

        /// <summary>Material | Labour | Equipment</summary>
        [Required]
        [MaxLength(20)]
        public string ItemType { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string ItemName { get; set; } = string.Empty;

        /// <summary>Quantity (must be >= 0).</summary>
        public double Quantity { get; set; }

        /// <summary>Unit of measurement, e.g. meters, units, hours, days.</summary>
        [MaxLength(50)]
        public string Unit { get; set; } = string.Empty;

        public decimal EstimatedUnitCost { get; set; }
        public decimal EstimatedTotalCost { get; set; }
    }

    /// <summary>Valid item type values for WorkOrderItem.</summary>
    public static class WorkOrderItemType
    {
        public const string Material  = "Material";
        public const string Labour    = "Labour";
        public const string Equipment = "Equipment";

        public static readonly string[] All = { Material, Labour, Equipment };
    }
}
