import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/work_order.dart';

class ApiService {
  // Configurable backend base URL (10.0.2.2 for Android emulator or LAN IP for physical device)
  static const String baseUrl = 'http://10.0.2.2:5000/api';

  static Future<List<WorkOrder>> getAssignedWorkOrders({String? workerName}) async {
    try {
      final uri = Uri.parse('$baseUrl/work-orders?status=ASSIGNED');
      final response = await http.get(uri);
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final list = data['data'] as List<dynamic>;
        return list.map((e) => WorkOrder.fromJson(e)).toList();
      }
      return [];
    } catch (e) {
      print('[ApiService] Error fetching assigned orders: $e');
      return [];
    }
  }

  static Future<bool> startWork(int workOrderId) async {
    try {
      final uri = Uri.parse('$baseUrl/work-orders/$workOrderId/start');
      final response = await http.post(uri);
      return response.statusCode == 200;
    } catch (e) {
      print('[ApiService] Error starting work: $e');
      return false;
    }
  }

  static Future<Map<String, dynamic>> completeWork({
    required int workOrderId,
    required double actualCost,
    required List<String> materialsUsed,
    required String beforePhoto,
    required String afterPhoto,
    required String completionNotes,
    required double completionLat,
    required double completionLng,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/work-orders/$workOrderId/complete');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'actualCost': actualCost,
          'materialsUsed': materialsUsed,
          'beforePhoto': beforePhoto,
          'afterPhoto': afterPhoto,
          'completionNotes': completionNotes,
          'completionLat': completionLat,
          'completionLng': completionLng,
        }),
      );
      if (response.statusCode == 200) {
        // Trigger immediate safety audit verification
        final auditUri = Uri.parse('$baseUrl/work-orders/$workOrderId/audit');
        final auditResp = await http.post(auditUri);
        return json.decode(auditResp.body);
      }
      return {'success': false, 'message': 'Failed to submit completion'};
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }
}
