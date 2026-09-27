import 'package:dio/dio.dart';
import '../models/work_order.dart';
import 'api_service.dart';

/// Read-only API service for Member 3 Work Orders.
/// Reuses the existing ApiService instance for Dio and JWT authentication.
class WorkOrderService {
  final ApiService _api;

  WorkOrderService(this._api);

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

  String _handleError(DioException e) {
    final data = e.response?.data;
    if (data is Map && data.containsKey('message')) {
      return data['message'] as String;
    }
    switch (e.response?.statusCode) {
      case 401:
        return 'Please log in again.';
      case 403:
        return 'Access denied. You do not have municipal permissions to view work orders.';
      case 404:
        return 'Work order not found.';
      default:
        return 'Network error. Please try again.';
    }
  }
}
