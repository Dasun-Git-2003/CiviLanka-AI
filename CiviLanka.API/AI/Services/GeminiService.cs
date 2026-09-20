using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using CiviLanka.API.AI.Interfaces;
using CiviLanka.API.AI.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CiviLanka.API.AI.Services
{
    public class GeminiService : IAIService
    {
        private readonly HttpClient _httpClient;
        private readonly AISettings _settings;
        private readonly ILogger<GeminiService> _logger;
        private readonly string? _apiKey;

        public bool IsConfigured => !string.IsNullOrWhiteSpace(_apiKey) && _apiKey != "YOUR_GEMINI_API_KEY";
        public string ModelName => _settings.Model;

        public GeminiService(
            HttpClient httpClient,
            IOptions<AISettings> settings,
            IConfiguration configuration,
            ILogger<GeminiService> logger)
        {
            _httpClient = httpClient;
            _settings = settings.Value;
            _logger = logger;

            // Precedence: Environment variable GOOGLE_API_KEY -> AISettings:ApiKey -> GeminiSettings:ApiKey
            _apiKey = Environment.GetEnvironmentVariable("GOOGLE_API_KEY");
            if (string.IsNullOrWhiteSpace(_apiKey))
            {
                _apiKey = _settings.ApiKey;
            }
            if (string.IsNullOrWhiteSpace(_apiKey))
            {
                _apiKey = configuration["GeminiSettings:ApiKey"];
            }

            if (string.IsNullOrWhiteSpace(_apiKey) || _apiKey == "YOUR_GEMINI_API_KEY")
            {
                _logger.LogWarning("Gemini API Key is not configured in GOOGLE_API_KEY or appsettings.json. AI features will report AI_FAILED / MANUAL_REVIEW.");
            }
            else
            {
                _logger.LogInformation("GeminiService initialized with model {Model}", _settings.Model);
            }
        }

        public async Task<string?> GenerateStructuredJsonAsync(string systemPrompt, string userPrompt)
        {
            if (!IsConfigured)
            {
                _logger.LogWarning("Gemini API key is not configured. Cannot perform AI inference.");
                return null;
            }

            var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{_settings.Model}:generateContent?key={_apiKey}";
            var maxRetries = Math.Max(1, _settings.MaxRetries);

            var requestBody = new
            {
                system_instruction = new
                {
                    parts = new[] { new { text = systemPrompt } }
                },
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = userPrompt } }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.1,
                    responseMimeType = "application/json"
                }
            };

            var jsonPayload = JsonSerializer.Serialize(requestBody);

            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(_settings.TimeoutSeconds));
                    using var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                    var response = await _httpClient.PostAsync(endpoint, content, cts.Token);

                    if (!response.IsSuccessStatusCode)
                    {
                        var errorDetails = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("Gemini API HTTP {StatusCode} (Attempt {Attempt}/{Max}): {Details}",
                            response.StatusCode, attempt, maxRetries, errorDetails);

                        if (attempt == maxRetries) return null;
                        await Task.Delay(500 * attempt);
                        continue;
                    }

                    var responseJson = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseJson);

                    if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                        candidates.GetArrayLength() > 0 &&
                        candidates[0].TryGetProperty("content", out var candidateContent) &&
                        candidateContent.TryGetProperty("parts", out var parts) &&
                        parts.GetArrayLength() > 0 &&
                        parts[0].TryGetProperty("text", out var textElement))
                    {
                        var rawText = textElement.GetString()?.Trim();
                        return CleanJsonText(rawText);
                    }

                    _logger.LogWarning("Gemini API response did not contain text content. Raw: {Raw}", responseJson);
                    return null;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Gemini API request failed on attempt {Attempt}/{Max}", attempt, maxRetries);
                    if (attempt == maxRetries) return null;
                    await Task.Delay(500 * attempt);
                }
            }

            return null;
        }

        private static string? CleanJsonText(string? text)
        {
            if (string.IsNullOrWhiteSpace(text)) return null;

            if (text.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            {
                text = text.Substring(7);
            }
            else if (text.StartsWith("```"))
            {
                text = text.Substring(3);
            }

            if (text.EndsWith("```"))
            {
                text = text.Substring(0, text.Length - 3);
            }

            return text.Trim();
        }
    }
}
