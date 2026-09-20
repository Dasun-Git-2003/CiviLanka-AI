namespace CiviLanka.API.AI.Models
{
    public class AISettings
    {
        public const string SectionName = "AISettings";

        /// <summary>Gemini foundation model to use (default: gemini-2.5-flash or gemini-2.0-flash).</summary>
        public string Model { get; set; } = "gemini-2.5-flash";

        /// <summary>Google API key for Gemini. If omitted, falls back to GOOGLE_API_KEY environment variable.</summary>
        public string? ApiKey { get; set; }

        /// <summary>Minimum confidence threshold below which human review is mandatory (default: 0.75).</summary>
        public double MinimumConfidence { get; set; } = 0.75;

        /// <summary>Cost threshold in LKR requiring Field Maintenance Supervisor approval (default: 100,000).</summary>
        public decimal SupervisorApprovalCost { get; set; } = 100000;

        /// <summary>Cost threshold in LKR requiring Public Works Director approval (default: 500,000).</summary>
        public decimal DirectorApprovalCost { get; set; } = 500000;

        /// <summary>Whether High or Critical risk ratings require mandatory supervisor sign-off.</summary>
        public bool HighRiskRequiresApproval { get; set; } = true;

        /// <summary>Maximum retry count for Gemini network/parse failures.</summary>
        public int MaxRetries { get; set; } = 2;

        /// <summary>Timeout in seconds for LLM inferences.</summary>
        public int TimeoutSeconds { get; set; } = 30;
    }
}
