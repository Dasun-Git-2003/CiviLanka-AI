import 'package:dio/dio.dart';
import '../models/work_order.dart';
import 'api_service.dart';

/// API service for Member 3 Work Orders (CRUD + Queries).
/// Reuses the existing ApiService instance for Dio and JWT authentication.
class WorkOrderService {
  final ApiService _api;

  WorkOrderService(this._api);

  // ── READ ──────────────────────────────────────────────────────────────────

  /// Fetch all active work orders accessible to the authenticated user.
  /// Backend returns full list for Supervisors/Directors/Staff,
  /// or assigned work orders for Field Workers.
  Future<List<WorkOrder>> getWorkOrders() async {
    try {
      final response = await _api.dio.get('/api/workorders');
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => WorkOrder.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Fetch a specific work order by its unique GUID.
  Future<WorkOrder> getWorkOrderById(String id) async {
    try {
      final response = await _api.dio.get('/api/workorders/$id');
      return WorkOrder.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ── WRITE ─────────────────────────────────────────────────────────────────

  /// Create a new work order on the backend (POST /api/workorders).
  /// Requires CanCreateWorkOrder policy (Supervisor, Director, Staff).
  Future<WorkOrder> createWorkOrder(CreateWorkOrderInput input) async {
    try {
      final response = await _api.dio.post(
        '/api/workorders',
        data: input.toJson(),
      );
      return WorkOrder.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Update an existing work order on the backend (PUT /api/workorders/{id}).
  /// Staff only (CanManageWorkOrders policy).
  Future<WorkOrder> updateWorkOrder(
      String id, UpdateWorkOrderInput input) async {
    try {
      final response = await _api.dio.put(
        '/api/workorders/$id',
        data: input.toJson(),
      );
      return WorkOrder.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  /// Soft-cancel a work order on the backend (DELETE /api/workorders/{id}).
  /// Preserves audit trail; marks status as CANCELLED.
  Future<bool> cancelWorkOrder(String id) async {
    try {
      final response = await _api.dio.delete('/api/workorders/$id');
      return response.statusCode == 200 || response.statusCode == 204;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  // ── LINKED ENTITIES HELPERS ───────────────────────────────────────────────

  /// Fetch available active citizen hazards for optional linking.
  /// Gracefully falls back to empty list on error.
  Future<List<HazardOption>> getAvailableHazards() async {
    try {
      final response = await _api.dio.get('/api/hazards');
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => HazardOption.fromJson(json as Map<String, dynamic>))
          .where((h) => h.id.isNotEmpty)
          .toList();
    } catch (_) {
      return const [];
    }
  }

  /// Fetch available infrastructure assets for optional linking.
  /// Gracefully falls back to empty list on error.
  Future<List<AssetOption>> getAvailableAssets() async {
    try {
      final response = await _api.dio.get('/api/assets');
      final List<dynamic> data = response.data as List<dynamic>;
      return data
          .map((json) => AssetOption.fromJson(json as Map<String, dynamic>))
          .where((a) => a.id.isNotEmpty)
          .toList();
    } catch (_) {
      return const [];
    }
  }

  // ── ERROR HANDLING ────────────────────────────────────────────────────────

  String _handleError(DioException e) => extractErrorMessage(e);

  /// Extracts backend error or validation messages from DioException responses.
  /// Authoritative validation messages returned by ASP.NET (such as invalid status transitions)
  /// are preserved and surfaced directly to the user.
  static String extractErrorMessage(DioException e) {
    final data = e.response?.data;
    if (data is Map) {
      if (data.containsKey('errors') && data['errors'] is Map) {
        final errorsMap = data['errors'] as Map;
        final List<String> errorList = [];
        for (final entry in errorsMap.entries) {
          if (entry.value is List) {
            errorList.addAll((entry.value as List).map((v) => v.toString()));
          } else {
            errorList.add(entry.value.toString());
          }
        }
        if (errorList.isNotEmpty) {
          return errorList.join('\n');
        }
      }
      if (data.containsKey('message')) {
        return data['message'] as String;
      }
    }
    switch (e.response?.statusCode) {
      case 400:
        return 'Invalid request. Please verify all inputs.';
      case 401:
        return 'Please log in again.';
      case 403:
        return 'Access denied. You do not have municipal permissions to perform this action.';
      case 404:
        return 'Work order not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'Network error. Please try again.';
    }
  }
}
