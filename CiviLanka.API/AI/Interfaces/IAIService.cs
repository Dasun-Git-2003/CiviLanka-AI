using System.Threading.Tasks;

namespace CiviLanka.API.AI.Interfaces
{
    public interface IAIService
    {
        bool IsConfigured { get; }
        string ModelName { get; }

        /// <summary>
        /// Sends system prompt and user prompt to Google Gemini and returns structured JSON output.
        /// Handles retry with MAX_RETRIES = 2, timeout, and clean JSON extraction.
        /// </summary>
        Task<string?> GenerateStructuredJsonAsync(string systemPrompt, string userPrompt);
    }
}
