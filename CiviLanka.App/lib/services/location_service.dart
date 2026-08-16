import 'package:geolocator/geolocator.dart';

class LocationResult {
  final double latitude;
  final double longitude;
  const LocationResult({required this.latitude, required this.longitude});
}

class LocationService {
  /// Request permission and return current GPS position.
  /// Returns null if permission is denied — caller must handle gracefully.
  Future<LocationResult?> getCurrentLocation() async {
    // Check if location services are enabled
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return null; // GPS is off — do not crash
    }

    // Check/request permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return null; // Permission denied — return null, not throw
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return null; // Permanently denied — user must go to settings
    }

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );
      return LocationResult(
        latitude: position.latitude,
        longitude: position.longitude,
      );
    } catch (_) {
      return null;
    }
  }

  Future<bool> get isPermissionGranted async {
    final permission = await Geolocator.checkPermission();
    return permission == LocationPermission.always ||
        permission == LocationPermission.whileInUse;
  }
}
