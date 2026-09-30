// CiviLanka.App/lib/services/work_order_service.dart
// Member 4 Service communicating with Express backend on port 5000

import 'dart:io';
import 'package:dio/dio.dart';
import '../models/work_order.dart';
import 'api_service.dart';

class WorkOrderService {
  final ApiService _api;

  WorkOrderService(this._api);

  /// Fetch list of work orders, optionally filtered by status (e.g. ASSIGNED, PENDING_APPROVAL)
  Future<List<WorkOrder>> getWorkOrders({String? status}) async {
    try {
      final queryParams = status != null ? {'status': status} : null;
      final response = await _api.dio.get(
        '/api/work-orders',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200 && response.data != null) {
        final List<dynamic> list = response.data['data'] as List<dynamic>;
        return list.map((json) => WorkOrder.fromJson(json as Map<String, dynamic>)).toList();
      }
      return [];
    } on DioException catch (e) {
      print('[WorkOrderService] Error fetching work orders: $e');
      return [];
    }
  }

  /// Get specific work order by ID
  Future<WorkOrder?> getWorkOrderById(int id) async {
    try {
      final response = await _api.dio.get('/api/work-orders/$id');
      if (response.statusCode == 200 && response.data != null) {
        return WorkOrder.fromJson(response.data['data'] as Map<String, dynamic>);
      }
      return null;
    } on DioException catch (e) {
      print('[WorkOrderService] Error fetching work order #$id: $e');
      return null;
    }
  }

  /// Field Worker: Transition state from ASSIGNED -> IN_PROGRESS
  Future<bool> startWork(int id) async {
    try {
      final response = await _api.dio.post('/api/work-orders/$id/start');
      return response.statusCode == 200;
    } on DioException catch (e) {
      print('[WorkOrderService] Error starting work order #$id: $e');
      return false;
    }
  }

  /// Upload on-site photographic evidence (Before or After repair)
  Future<String?> uploadEvidencePhoto(File file) async {
    try {
      final fileName = file.path.split(Platform.pathSeparator).last;
      final formData = FormData.fromMap({
        'photo': await MultipartFile.fromFile(file.path, filename: fileName),
      });

      final response = await _api.dio.post('/api/upload', data: formData);
      if (response.statusCode == 200 && response.data != null) {
        return response.data['url'] as String?;
      }
      return null;
    } on DioException catch (e) {
      print('[WorkOrderService] Error uploading photo: $e');
      return null;
    }
  }

  /// Field Worker: Submit completion evidence (photos, materials, GPS, costs)
  Future<Map<String, dynamic>> completeWork({
    required int id,
    required double actualCost,
    required List<String> materialsUsed,
    required String beforePhoto,
    required String afterPhoto,
    required String completionNotes,
    required double completionLat,
    required double completionLng,
  }) async {
    try {
      final response = await _api.dio.post(
        '/api/work-orders/$id/complete',
        data: {
          'actualCost': actualCost,
          'materialsUsed': materialsUsed,
          'beforePhoto': beforePhoto,
          'afterPhoto': afterPhoto,
          'completionNotes': completionNotes,
          'completionLat': completionLat,
          'completionLng': completionLng,
        },
      );

      if (response.statusCode == 200) {
        // Trigger municipal safety audit agent evaluation
        final auditResult = await evaluateSafetyAudit(
          workOrderId: id,
          actualCost: actualCost,
          beforePhoto: beforePhoto,
          afterPhoto: afterPhoto,
          completionLat: completionLat,
          completionLng: completionLng,
          completionNotes: completionNotes,
        );

        return {
          'success': true,
          'message': 'Work order completed and audited',
          'auditResult': auditResult,
        };
      }
      return {'success': false, 'message': 'Failed to complete work order'};
    } on DioException catch (e) {
      print('[WorkOrderService] Error completing work order #$id: $e');
      return {'success': false, 'message': e.message};
    }
  }

  /// Trigger Autonomous Municipal Safety & Audit Agent evaluation
  Future<Map<String, dynamic>?> evaluateSafetyAudit({
    required int workOrderId,
    double? actualCost,
    String? beforePhoto,
    String? afterPhoto,
    double? completionLat,
    double? completionLng,
    String? completionNotes,
  }) async {
    try {
      final response = await _api.dio.post(
        '/api/agent/safety-audit',
        data: {
          'workOrderId': workOrderId,
          if (actualCost != null) 'actual_cost': actualCost,
          if (beforePhoto != null) 'before_photo': beforePhoto,
          if (afterPhoto != null) 'after_photo': afterPhoto,
          if (completionLat != null) 'completion_lat': completionLat,
          if (completionLng != null) 'completion_lng': completionLng,
          if (completionNotes != null) 'completion_notes': completionNotes,
        },
      );

      if (response.statusCode == 200 && response.data != null) {
        return response.data as Map<String, dynamic>;
      }
      return null;
    } on DioException catch (e) {
      print('[WorkOrderService] Error running safety audit: $e');
      return null;
    }
  }

  /// Public Works Director: Authorize work order requiring human sign-off
  Future<bool> directorApprove({
    required int id,
    double? approvedAmount,
    String? notes,
  }) async {
    try {
      final response = await _api.dio.post(
        '/api/work-orders/$id/approve',
        data: {
          'approvedAmount': approvedAmount,
          'notes': notes ?? 'Authorized via Mobile Executive App',
        },
      );
      return response.statusCode == 200;
    } on DioException catch (e) {
      print('[WorkOrderService] Error approving work order #$id: $e');
      return false;
    }
  }

  /// Municipal Budget Summary KPI Metrics
  Future<Map<String, dynamic>?> getBudgetSummary() async {
    try {
      final response = await _api.dio.get('/api/budgets/summary');
      if (response.statusCode == 200 && response.data != null) {
        return response.data['data'] as Map<String, dynamic>?;
      }
      return null;
    } on DioException catch (e) {
      print('[WorkOrderService] Error fetching budget summary: $e');
      return null;
    }
  }
}
