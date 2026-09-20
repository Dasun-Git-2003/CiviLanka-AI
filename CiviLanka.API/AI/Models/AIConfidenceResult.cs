namespace CiviLanka.API.AI.Models
{
    public class AIConfidenceEvaluation
    {
        public double ModelConfidence { get; set; }
        public double ContextCompletenessScore { get; set; }
        public double HistoricalDataAvailabilityScore { get; set; }
        public double FinalConfidence { get; set; }
        public bool RequiresHumanReview { get; set; }
        public string ConfidenceRating { get; set; } = "HIGH"; // VERY_LOW | LOW | MODERATE | HIGH | VERY_HIGH
        public List<string> ConfidenceFactors { get; set; } = new();
    }
}
