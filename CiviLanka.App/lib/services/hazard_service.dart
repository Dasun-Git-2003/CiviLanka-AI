import 'dart:io';
import 'package:dio/dio.dart';
import '../models/hazard.dart';
import '../models/infrastructure_asset.dart';
import 'api_service.dart';

class HazardService {
  final ApiService _api;

  HazardService(this._api);

  /// Create a new hazard report. Optionally upload an image first.
  Future<Hazard> createHazard({
    required String category,
    required String description,
    double? latitude,
    double? longitude,
    File? imageFile,
  }) async {
    String? imageUrl;

    // Upload image first if provided
    if (imageFile != null) {
      imageUrl = await _uploadImage(imageFile);
    }

    try {
      final response = await _api.dio.post(
        '/api/hazards',
        data: {
          'category': category,
          'description': description,
          if (latitude != null) 'latitude': latitude,
          if (longitude != null) 'longitude': longitude,
          if (imageUrl != null) 'imageUrl': imageUrl,
        },
      );
      return Hazard.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Get all hazards submitted by the authenticated citizen.
  Future<List<Hazard>> getMyHazards() async {
    try {
      final response = await _api.dio.get('/api/hazards/my');
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => Hazard.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Get a specific hazard by ID.
  Future<Hazard> getHazardById(String id) async {
    try {
      final response = await _api.dio.get('/api/hazards/$id');
      return Hazard.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Update an editable hazard.
  Future<Hazard> updateHazard({
    required String id,
    String? category,
    String? description,
    double? latitude,
    double? longitude,
    File? newImageFile,
  }) async {
    String? imageUrl;
    if (newImageFile != null) {
      imageUrl = await _uploadImage(newImageFile);
    }

    try {
      final response = await _api.dio.put(
        '/api/hazards/$id',
        data: {
          if (category != null) 'category': category,
          if (description != null) 'description': description,
          if (latitude != null) 'latitude': latitude,
          if (longitude != null) 'longitude': longitude,
          if (imageUrl != null) 'imageUrl': imageUrl,
        },
      );
      return Hazard.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Soft-cancel (delete) a hazard.
  Future<void> cancelHazard(String id) async {
    try {
      await _api.dio.delete('/api/hazards/$id');
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Get the latest AI analysis for a hazard.
  Future<HazardAIAnalysis?> getAIAnalysis(String hazardId) async {
    try {
      final response =
          await _api.dio.get('/api/hazards/$hazardId/ai-analysis');
      return HazardAIAnalysis.fromJson(
          response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw _handleError(e);
    }
  }

  // ── Dashboard Stats ──────────────────────────────────────────────────────────

  Future<Map<String, int>> getDashboardStats() async {
    final hazards = await getMyHazards();
    final total = hazards.length;
    final pending = hazards
        .where((h) =>
            h.status == 'Submitted' || h.status == 'PendingAIAnalysis')
        .length;
    final highPriority = hazards
        .where((h) => h.priority == 'URGENT' || h.priority == 'HIGH')
        .length;
    final completed =
        hazards.where((h) => h.status == 'Resolved').length;

    return {
      'total': total,
      'pending': pending,
      'highPriority': highPriority,
      'completed': completed,
    };
  }

  /// Get all active hazards across the municipality (Staff/Supervisor access).
  Future<List<Hazard>> getAllHazards() async {
    try {
      final response = await _api.dio.get('/api/hazards/map');
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => Hazard.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException {
      try {
        final response = await _api.dio.get('/api/hazards');
        final List<dynamic> data = response.data as List<dynamic>;
        return data
            .map((json) => Hazard.fromJson(json as Map<String, dynamic>))
            .toList();
      } on DioException catch (e) {
        throw _handleError(e);
      }
    }
  }

  /// Get municipal infrastructure assets (from DB /api/assets or Colombo defaults).
  Future<List<InfrastructureAsset>> getAssets() async {
    try {
      final response = await _api.dio.get('/api/assets');
      final List<dynamic> data = response.data as List<dynamic>;
      if (data.isEmpty) {
        return InfrastructureAsset.defaultFallbackAssets;
      }
      return data
          .map((json) =>
              InfrastructureAsset.fromJson(json as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return InfrastructureAsset.defaultFallbackAssets;
    }
  }

  /// Get real-time Supervisor Dashboard stats matching Photo 1:
  /// 1. Total Active Map Pins (hazards with coords + assets with coords)
  /// 2. Citizen Hazard Reports (total active hazard reports)
  /// 3. Critical / Urgent Hazards (severity CRITICAL/HIGH or priority URGENT)
  /// 4. Repair Attention Needed (hazards needing repair + assets in poor condition)
  Future<SupervisorDashboardStats> getSupervisorStats() async {
    List<Hazard> hazards = [];
    List<InfrastructureAsset> assets = [];

    try {
      hazards = await getAllHazards();
    } catch (_) {
      try {
        hazards = await getMyHazards();
      } catch (_) {
        hazards = [];
      }
    }

    try {
      assets = await getAssets();
    } catch (_) {
      assets = InfrastructureAsset.defaultFallbackAssets;
    }

    final activeHazards = hazards.where((h) => !h.isCancelled).toList();
    final hazardPins = activeHazards
        .where((h) => h.latitude != null && h.longitude != null)
        .length;
    final assetPins = assets
        .where((a) => a.latitude != null && a.longitude != null)
        .length;

    final totalActiveMapPins = hazardPins + assetPins;
    final citizenHazardReports = activeHazards.length;
    final criticalUrgentHazards = activeHazards
        .where((h) =>
            (h.severity ?? '').toUpperCase() == 'CRITICAL' ||
            (h.severity ?? '').toUpperCase() == 'HIGH' ||
            (h.priority ?? '').toUpperCase() == 'URGENT')
        .length;

    final poorHazards = activeHazards
        .where((h) =>
            (h.severity ?? '').toUpperCase() == 'CRITICAL' ||
            (h.severity ?? '').toUpperCase() == 'HIGH')
        .length;
    final poorAssets = assets
        .where((a) => (a.latestCondition ?? '').toLowerCase() == 'poor')
        .length;
    final repairAttentionNeeded = poorHazards + poorAssets;

    return SupervisorDashboardStats(
      totalActiveMapPins: totalActiveMapPins,
      citizenHazardReports: citizenHazardReports,
      criticalUrgentHazards: criticalUrgentHazards,
      repairAttentionNeeded: repairAttentionNeeded,
      hazards: activeHazards,
      assets: assets,
    );
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  Future<String?> _uploadImage(File imageFile) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          imageFile.path,
          filename: 'hazard_image.jpg',
        ),
      });
      final response = await _api.dio.post(
        '/api/hazards/upload-image',
        data: formData,
      );
      return response.data['imageUrl'] as String?;
    } catch (_) {
      return null; // Image upload failure should not block hazard submission
    }
  }

  String _handleError(DioException e) {
    final data = e.response?.data;
    if (data is Map && data.containsKey('message')) {
      return data['message'] as String;
    }
    switch (e.response?.statusCode) {
      case 401:
        return 'Please log in again.';
      case 403:
        return 'Access denied.';
      case 404:
        return 'Hazard not found.';
      default:
        return 'Network error. Please try again.';
    }
  }
}

class SupervisorDashboardStats {
  final int totalActiveMapPins;
  final int citizenHazardReports;
  final int criticalUrgentHazards;
  final int repairAttentionNeeded;
  final List<Hazard> hazards;
  final List<InfrastructureAsset> assets;

  const SupervisorDashboardStats({
    required this.totalActiveMapPins,
    required this.citizenHazardReports,
    required this.criticalUrgentHazards,
    required this.repairAttentionNeeded,
    required this.hazards,
    required this.assets,
  });
}
