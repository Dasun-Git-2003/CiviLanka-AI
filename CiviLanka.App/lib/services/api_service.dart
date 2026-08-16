import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Base HTTP client for all API communication.
/// Automatically attaches the JWT Bearer token to every authenticated request.
/// Handles token storage, retrieval, and 401 interception.
class ApiService {
  static const String _baseUrl =
      'http://10.0.2.2:5000'; // Android emulator → localhost
  //   'http://192.168.1.X:5000'; // Physical device — replace with your LAN IP

  static const String _tokenKey = 'jwt_token';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  late final Dio _dio;

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    // Auth interceptor — automatically attach JWT
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await getToken();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            await clearToken();
          }
          return handler.next(error);
        },
      ),
    );
  }

  // Expose Dio for services to use directly
  Dio get dio => _dio;

  // ── Token management ──────────────────────────────────────────────────────

  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: _tokenKey);
  }

  Future<bool> get isLoggedIn async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
