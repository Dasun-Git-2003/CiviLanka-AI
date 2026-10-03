import 'package:dio/dio.dart';
import '../models/user.dart';
import 'api_service.dart';

class UserService {
  final ApiService _api;

  UserService(this._api);

  /// Fetch the current user profile (GET /api/users/me)
  Future<User?> getCurrentUserProfile() async {
    try {
      final response = await _api.dio.get('/api/users/me');
      if (response.data != null && response.data is Map<String, dynamic>) {
        return User.fromJson(response.data as Map<String, dynamic>);
      }
      return null;
    } on DioException {
      return null;
    }
  }
}
