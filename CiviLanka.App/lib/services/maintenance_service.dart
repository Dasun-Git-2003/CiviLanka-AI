import 'dart:io';
import 'package:dio/dio.dart';
import '../models/maintenance_record.dart';
import 'api_service.dart';

class MaintenanceService {
  final ApiService _api;

  MaintenanceService(this._api);

  /// Fetch all records (supervisor/director/all)
  Future<List<MaintenanceRecord>> getRecords() async {
    try {
      final response = await _api.dio.get('/api/maintenance-records');
      if (response.statusCode == 200 && response.data is List) {
        return (response.data as List)
            .map((item) => MaintenanceRecord.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to load maintenance records');
    }
  }

  /// Fetch active assignments for the logged-in field inspector / worker
  Future<List<MaintenanceRecord>> getMyAssignments() async {
    try {
      final response = await _api.dio.get('/api/maintenance-records/my-assigned');
      if (response.statusCode == 200 && response.data is List) {
        return (response.data as List)
            .map((item) => MaintenanceRecord.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to load assigned inspections');
    }
  }

  /// Create a new maintenance record
  Future<MaintenanceRecord?> createRecord({
    required String workOrderId,
    required String description,
    required String maintenanceType,
    required double labourHours,
    required double actualCost,
    String? materialsUsed,
    String? equipmentUsed,
    String? beforeImageUrl,
    String? afterImageUrl,
    String? workerNotes,
  }) async {
    try {
      final response = await _api.dio.post(
        '/api/maintenance-records',
        data: {
          'workOrderId': workOrderId,
          'description': description,
          'maintenanceType': maintenanceType,
          'labourHours': labourHours,
          'actualCost': actualCost,
          if (materialsUsed != null) 'materialsUsed': materialsUsed,
          if (equipmentUsed != null) 'equipmentUsed': equipmentUsed,
          if (beforeImageUrl != null) 'beforeImageUrl': beforeImageUrl,
          if (afterImageUrl != null) 'afterImageUrl': afterImageUrl,
          if (workerNotes != null) 'workerNotes': workerNotes,
        },
      );
      if (response.statusCode == 201 && response.data != null) {
        return MaintenanceRecord.fromJson(response.data as Map<String, dynamic>);
      }
      return null;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to submit maintenance record');
    }
  }

  /// Update maintenance record status (e.g. IN_PROGRESS, COMPLETED)
  Future<bool> updateStatus(String id, String status, {String? notes}) async {
    try {
      final response = await _api.dio.patch(
        '/api/maintenance-records/$id/status',
        data: {
          'status': status,
          'notes': notes,
        },
      );
      return response.statusCode == 200 || response.statusCode == 204;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to update record status');
    }
  }

  /// Update record metrics / notes
  Future<bool> updateDetails(String id, {
    String? workerNotes,
    double? labourHours,
    double? actualCost,
    String? materialsUsed,
  }) async {
    try {
      final response = await _api.dio.put(
        '/api/maintenance-records/$id',
        data: {
          if (workerNotes != null) 'workerNotes': workerNotes,
          if (labourHours != null) 'labourHours': labourHours,
          if (actualCost != null) 'actualCost': actualCost,
          if (materialsUsed != null) 'materialsUsed': materialsUsed,
        },
      );
      return response.statusCode == 200;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to update maintenance details');
    }
  }

  /// Upload photo evidence ('before' or 'after')
  Future<String?> uploadEvidence(String id, String evidenceType, File file) async {
    try {
      final formData = FormData.fromMap({
        'evidenceType': evidenceType,
        'file': await MultipartFile.fromFile(file.path, filename: 'evidence_${evidenceType}.jpg'),
      });
      final response = await _api.dio.post(
        '/api/maintenance-records/$id/upload-evidence',
        data: formData,
      );
      if (response.statusCode == 200 && response.data != null) {
        final updated = MaintenanceRecord.fromJson(response.data as Map<String, dynamic>);
        return evidenceType == 'before' ? updated.beforeImageUrl : updated.afterImageUrl;
      }
      return null;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to upload photo evidence');
    }
  }

  /// Run AI Safety & Compliance Analysis on the maintenance record
  Future<SafetyAnalysis?> runSafetyAnalysis(String id) async {
    try {
      final response = await _api.dio.post('/api/maintenance-records/$id/safety-analysis');
      if (response.statusCode == 200 && response.data != null) {
        return SafetyAnalysis.fromJson(response.data as Map<String, dynamic>);
      }
      return null;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to execute AI safety audit');
    }
  }
}
