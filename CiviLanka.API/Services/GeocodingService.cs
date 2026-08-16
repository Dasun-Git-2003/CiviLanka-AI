using System.Text.Json;

namespace CiviLanka.API.Services
{
    public interface IGeocodingService
    {
        Task<string?> ReverseGeocodeAsync(double latitude, double longitude);
        Task<string> GetLocationContextAsync(double latitude, double longitude);
    }

    /// <summary>
    /// Uses Nominatim (OpenStreetMap) for free reverse geocoding. No API key required.
    /// Rate limit: max 1 request/second. Production deployments should cache results.
    /// </summary>
    public class GeocodingService : IGeocodingService
    {
        private readonly HttpClient _http;
        private readonly ILogger<GeocodingService> _logger;

        public GeocodingService(HttpClient http, ILogger<GeocodingService> logger)
        {
            _http = http;
            _logger = logger;
        }

        public async Task<string?> ReverseGeocodeAsync(double latitude, double longitude)
        {
            try
            {
                var url = $"https://nominatim.openstreetmap.org/reverse?format=json&lat={latitude}&lon={longitude}&zoom=18&addressdetails=1";
                _http.DefaultRequestHeaders.UserAgent.TryParseAdd("CiviLanka-AI/1.0");
                var response = await _http.GetStringAsync(url);
                using var doc = JsonDocument.Parse(response);
                if (doc.RootElement.TryGetProperty("display_name", out var name))
                    return name.GetString();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Reverse geocoding failed for ({Lat},{Lon})", latitude, longitude);
            }
            return null;
        }

        public async Task<string> GetLocationContextAsync(double latitude, double longitude)
        {
            try
            {
                var url = $"https://nominatim.openstreetmap.org/reverse?format=json&lat={latitude}&lon={longitude}&zoom=16&addressdetails=1";
                _http.DefaultRequestHeaders.UserAgent.TryParseAdd("CiviLanka-AI/1.0");
                var response = await _http.GetStringAsync(url);
                using var doc = JsonDocument.Parse(response);
                var root = doc.RootElement;

                var parts = new List<string>();

                if (root.TryGetProperty("address", out var addr))
                {
                    foreach (var key in new[] { "road", "suburb", "city", "county", "state" })
                    {
                        if (addr.TryGetProperty(key, out var val))
                            parts.Add(val.GetString()!);
                    }
                }

                // Check for known landmarks/categories in the area
                if (root.TryGetProperty("type", out var type))
                    parts.Add($"Area type: {type.GetString()}");

                return parts.Count > 0
                    ? string.Join(", ", parts)
                    : $"Coordinates: {latitude}, {longitude}";
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Location context failed for ({Lat},{Lon})", latitude, longitude);
                return $"Coordinates: {latitude}, {longitude}";
            }
        }
    }
}
