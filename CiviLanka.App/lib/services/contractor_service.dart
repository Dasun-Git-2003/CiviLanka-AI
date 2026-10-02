import 'package:dio/dio.dart';
import '../models/contractor.dart';
import 'api_service.dart';

class ContractorService {
  final ApiService _api;

  ContractorService(this._api);

  /// Fetch all contractors from backend API, or return fallback if offline
  Future<List<Contractor>> getContractors({
    String? search,
    String? specialization,
    bool? available,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (search != null && search.trim().isNotEmpty) {
        queryParams['search'] = search.trim();
      }
      if (specialization != null && specialization != 'All Specializations') {
        queryParams['specialization'] = specialization;
      }
      if (available != null) {
        queryParams['available'] = available;
      }

      final response = await _api.dio.get('/api/contractors', queryParameters: queryParams);
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => Contractor.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (_) {
      return Contractor.fallbackContractors;
    } catch (_) {
      return Contractor.fallbackContractors;
    }
  }

  /// Get contractor by ID
  Future<Contractor> getContractorById(int id) async {
    try {
      final response = await _api.dio.get('/api/contractors/$id');
      return Contractor.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Register a new contractor in the database
  Future<Contractor> createContractor({
    required String name,
    required String specialization,
    required String location,
    required String phone,
    String? email,
  }) async {
    try {
      final payload = <String, dynamic>{
        'name': name.trim(),
        'specialization': specialization.trim(),
        'location': location.trim(),
        'phone': phone.trim(),
        if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
      };

      final response = await _api.dio.post('/api/contractors', data: payload);
      return Contractor.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Update an existing contractor
  Future<Contractor> updateContractor({
    required int id,
    required String name,
    required String specialization,
    required String location,
    required String phone,
    String? email,
    required double rating,
    required bool isAvailable,
  }) async {
    try {
      final payload = <String, dynamic>{
        'name': name.trim(),
        'specialization': specialization.trim(),
        'location': location.trim(),
        'phone': phone.trim(),
        if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
        'rating': rating,
        'isAvailable': isAvailable,
      };

      final response = await _api.dio.put('/api/contractors/$id', data: payload);
      return Contractor.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Delete contractor
  Future<void> deleteContractor(int id) async {
    try {
      await _api.dio.delete('/api/contractors/$id');
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
        return 'Contractor not found.';
      default:
        return 'Network request failed. Please check connection.';
    }
  }
}
