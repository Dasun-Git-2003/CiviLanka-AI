import 'package:dio/dio.dart';
import '../models/work_order.dart';
import 'api_service.dart';

class WorkOrderService {
  final ApiService _api;

  WorkOrderService(this._api);

  Future<List<WorkOrder>> getAllWorkOrders() async {
    try {
      final response = await _api.dio.get('/api/workorders');
      final List<dynamic> data = response.data as List<dynamic>;
      return data.map((json) => WorkOrder.fromJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<WorkOrder>> getMyAssignments() async {
    try {
      final response = await _api.dio.get('/api/workorders');
      final List<dynamic> data = response.data as List<dynamic>;
      return data.map((json) => WorkOrder.fromJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  String _handleError(DioException e) {
    final data = e.response?.data;
    if (data is Map && data.containsKey('message')) {
      return data['message'] as String;
    }
    return 'Failed to load work orders.';
  }
}
