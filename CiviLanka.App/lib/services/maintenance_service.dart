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
    try {
      final response = await _api.dio.get('/api/maintenance-records');
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => MaintenanceRecord.fromJson(json as Map<String, dynamic>))
          .toList();
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
