import 'package:dio/dio.dart';
import '../models/work_order.dart';
import 'api_service.dart';

class WorkOrderService {
  final ApiService _api;

  WorkOrderService(this._api);

  /// Fetch all work orders assigned to or accessible by the current user
  Future<List<WorkOrder>> getWorkOrders() async {
    try {
      final response = await _api.dio.get('/api/workorders');
      if (response.statusCode == 200 && response.data is List) {
        return (response.data as List)
            .map((item) => WorkOrder.fromJson(item as Map<String, dynamic>))
            .toList();
      }
      return [];
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to load work orders');
    }
  }

  /// Fetch work order by ID
  Future<WorkOrder?> getWorkOrderById(String id) async {
    try {
      final response = await _api.dio.get('/api/workorders/$id');
      if (response.statusCode == 200 && response.data != null) {
        return WorkOrder.fromJson(response.data as Map<String, dynamic>);
      }
      return null;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to load work order');
    }
  }

  /// Update work order status (e.g. IN_PROGRESS, COMPLETED, REQUIRES_CORRECTION)
  Future<bool> updateStatus(String id, String newStatus, {String? notes}) async {
    try {
      final response = await _api.dio.patch(
        '/api/workorders/$id/status',
        data: {
          'status': newStatus,
          'notes': notes,
        },
      );
      return response.statusCode == 200 || response.statusCode == 204;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? 'Failed to update work order status');
    }
  }
}
