import 'package:dio/dio.dart';
import '../models/infrastructure_asset.dart';
import 'api_service.dart';

class AssetService {
  final ApiService _api;

  AssetService(this._api);

  /// Fetch all infrastructure assets from the API database with optional filters.
  Future<List<InfrastructureAsset>> getAssets({
    String? search,
    String? type,
    String? status,
    String? condition,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (search != null && search.trim().isNotEmpty) queryParams['search'] = search.trim();
      if (type != null && type != 'All Types') queryParams['type'] = type;
      if (status != null && status != 'ALL') queryParams['status'] = status;
      if (condition != null && condition != 'ALL') queryParams['condition'] = condition;

      final response = await _api.dio.get('/api/assets', queryParameters: queryParams);
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => InfrastructureAsset.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (_) {
      // Return fallback assets if network fails or DB empty
      return InfrastructureAsset.defaultFallbackAssets;
    } catch (_) {
      return InfrastructureAsset.defaultFallbackAssets;
    }
  }

  /// Get asset by ID
  Future<InfrastructureAsset> getAssetById(String id) async {
    try {
      final response = await _api.dio.get('/api/assets/$id');
      return InfrastructureAsset.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Register a new infrastructure asset in the API database.
  Future<InfrastructureAsset> createAsset({
    required String name,
    required String type,
    required String status,
    required String condition,
    required String location,
    double? latitude,
    double? longitude,
    String? installationDate,
    String? customId,
    String? description,
  }) async {
    try {
      final payload = <String, dynamic>{
        'name': name.trim(),
        'type': type,
        'status': status,
        'condition': condition,
        'location': location.trim(),
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (installationDate != null && installationDate.isNotEmpty)
          'installationDate': installationDate,
        if (customId != null && customId.trim().isNotEmpty) 'id': customId.trim(),
        if (description != null && description.trim().isNotEmpty)
          'description': description.trim(),
      };

      final response = await _api.dio.post('/api/assets', data: payload);
      return InfrastructureAsset.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Update an existing infrastructure asset.
  Future<InfrastructureAsset> updateAsset({
    required String id,
    required String name,
    required String type,
    required String status,
    required String condition,
    required String location,
    double? latitude,
    double? longitude,
    String? installationDate,
    String? description,
  }) async {
    try {
      final payload = <String, dynamic>{
        'name': name.trim(),
        'type': type,
        'status': status,
        'condition': condition,
        'location': location.trim(),
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (installationDate != null) 'installationDate': installationDate,
        if (description != null) 'description': description,
      };

      final response = await _api.dio.put('/api/assets/$id', data: payload);
      return InfrastructureAsset.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Delete an asset
  Future<void> deleteAsset(String id) async {
    try {
      await _api.dio.delete('/api/assets/$id');
    } on DioException catch (e) {
      throw _handleError(e);
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
        return 'Access denied. You do not have permission for this action.';
      case 404:
        return 'Asset not found.';
      default:
        return 'Network request failed. Please check connection.';
    }
  }
}
