import 'package:dio/dio.dart';
import '../models/user.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api;

  AuthService(this._api);

  User? _currentUser;
  User? get currentUser => _currentUser;

  Future<User> register({
    required String fullName,
    required String email,
    required String password,
    String? phone,
  }) async {
    try {
      final response = await _api.dio.post(
        '/api/auth/register',
        data: {
          'fullName': fullName,
          'email': email,
          'password': password,
          if (phone != null) 'phone': phone,
        },
      );
      final user = User.fromJson(response.data as Map<String, dynamic>);
      await _api.saveToken(user.token);
      _currentUser = user;
      return user;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<User> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _api.dio.post(
        '/api/auth/login',
        data: {'email': email, 'password': password},
      );
      final user = User.fromJson(response.data as Map<String, dynamic>);
      await _api.saveToken(user.token);
      _currentUser = user;
      return user;
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> logout() async {
    await _api.clearToken();
    _currentUser = null;
  }

  String _handleError(DioException e) {
    final data = e.response?.data;
    if (data is Map && data.containsKey('message')) {
      return data['message'] as String;
    }
    switch (e.response?.statusCode) {
      case 401:
        return 'Invalid email or password.';
      case 400:
        return 'Please check your input and try again.';
      default:
        return 'Network error. Please try again.';
    }
  }
}
