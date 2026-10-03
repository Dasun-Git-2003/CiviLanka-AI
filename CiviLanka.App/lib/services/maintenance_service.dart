import 'dart:io';
import 'package:dio/dio.dart';
import '../models/maintenance_record.dart';
import 'api_service.dart';

class MaintenanceService {
  final ApiService _api;

  MaintenanceService(this._api);

  Future<List<MaintenanceRecord>> getMyAssignments() async {
    try {
      final response = await _api.dio.get('/api/maintenance-records/my-assigned');
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => MaintenanceRecord.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<MaintenanceRecord>> getAllRecords() async {
    return getAll();
  }

  Future<List<MaintenanceRecord>> getAll({String? status}) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null && status.isNotEmpty && status != 'All') {
        queryParams['status'] = status;
      }
      final response = await _api.dio.get('/api/maintenance-records', queryParameters: queryParams);
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => MaintenanceRecord.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<MaintenanceRecord> getById(String id) async {
    try {
      final response = await _api.dio.get('/api/maintenance-records/$id');
      return MaintenanceRecord.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      // Fallback: load all and filter if endpoint doesn't exist
      if (e.response?.statusCode == 404 || e.response?.statusCode == 405) {
        final all = await getAll();
        final record = all.where((r) => r.id == id).firstOrNull;
        if (record != null) return record;
      }
      throw _handleError(e);
    }
  }

  Future<MaintenanceRecord?> getByIdOrNull(String id) async {
    try {
      return await getById(id);
    } catch (_) {
      return null;
    }
  }

  Future<List<MaintenanceRecord>> getPendingVerification() async {
    return getAll(status: 'WorkCompleted');
  }

  Future<void> verify(String id, {String? notes}) async {
    try {
      await _api.dio.post(
        '/api/maintenance-records/$id/verify',
        data: {'notes': notes ?? 'Verified by supervisor'},
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> requestCorrection(
    String id, {
    required String requiredCorrections,
    String? notes,
  }) async {
    try {
      await _api.dio.post(
        '/api/maintenance-records/$id/request-correction',
        data: {
          'requiredCorrections': requiredCorrections,
          if (notes != null) 'notes': notes,
        },
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<MaintenanceRecord> createRecord(Map<String, dynamic> data) async {
    try {
      final response = await _api.dio.post('/api/maintenance-records', data: data);
      return MaintenanceRecord.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> updateStatus(
    String id, {
    required String status,
    String? notes,
    double? hoursWorked,
    double? actualCost,
  }) async {
    try {
      final payload = <String, dynamic>{
        'status': status,
      };
      if (notes != null) payload['notes'] = notes;
      if (hoursWorked != null) payload['hoursWorked'] = hoursWorked;
      if (actualCost != null) payload['actualCost'] = actualCost;

      await _api.dio.put(
        '/api/maintenance-records/$id/status',
        data: payload,
      );
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<String?> uploadEvidence(
    String recordId, {
    required File file,
    required String evidenceType,
  }) async {
    try {
      final formData = FormData.fromMap({
        'evidenceType': evidenceType,
        'file': await MultipartFile.fromFile(
          file.path,
          filename: '${evidenceType}_evidence.jpg',
        ),
      });
      final response = await _api.dio.post(
        '/api/maintenance-records/$recordId/upload-evidence',
        data: formData,
      );
      return response.data['url'] as String? ?? response.data['imageUrl'] as String?;
    } catch (_) {
      return null;
    }
  }

  String _handleError(DioException e) {
    final data = e.response?.data;
    if (data is Map && data.containsKey('message')) {
      return data['message'] as String;
    }
    return 'Failed to process maintenance operation.';
  }
}
