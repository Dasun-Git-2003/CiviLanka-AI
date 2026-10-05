import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../core/constants/app_constants.dart';

/// Base HTTP client for all API communication.
/// Automatically attaches the JWT Bearer token to every authenticated request.
/// Handles token storage, retrieval, 401 interception, and dynamic server switching.
class ApiService extends ChangeNotifier {
  static const String prodUrl = ApiConstants.hostedBaseUrl;
  static const String localUsbUrl = 'http://localhost:5000';
  static const String localWifiUrl = 'http://192.168.1.100:5000';
  static const String localEmulatorUrl = 'http://10.0.2.2:5000';

  static const String _tokenKey = 'jwt_token';
  static const String _baseUrlStorageKey = 'custom_base_url';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  late Dio _dio;
  String _currentBaseUrl = ApiConstants.defaultBaseUrl;

  ApiService() {
    _initDio(_currentBaseUrl);
    _loadCustomBaseUrl();
  }

  String get baseUrl => _currentBaseUrl;

  bool get isUsingCloud =>
      _currentBaseUrl.contains('azurewebsites.net') ||
      _currentBaseUrl.contains('civilanka');

  String get serverDisplayName {
    if (isUsingCloud) return 'Azure Cloud';
    if (_currentBaseUrl.contains('10.0.2.2')) return 'Android Emulator';
    if (_currentBaseUrl.contains('localhost')) return 'Local USB (localhost)';
    return _currentBaseUrl;
  }

  void _initDio(String url) {
    _dio = Dio(BaseOptions(
      baseUrl: url,
      connectTimeout: const Duration(seconds: 25),
      receiveTimeout: const Duration(seconds: 90),
      headers: {'Content-Type': 'application/json'},
    ));

    // Auth interceptor â€” automatically attach JWT
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await getToken();
          if (token != null && token.isNotEmpty) {
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

  Future<void> _loadCustomBaseUrl() async {
    final saved = await _storage.read(key: _baseUrlStorageKey);
    if (saved != null && saved.trim().isNotEmpty) {
      _currentBaseUrl = saved.trim();
      _dio.options.baseUrl = _currentBaseUrl;
      notifyListeners();
    }
  }

  Future<void> setBaseUrl(String newUrl) async {
    _currentBaseUrl = newUrl.trim();
    _dio.options.baseUrl = _currentBaseUrl;
    await _storage.write(key: _baseUrlStorageKey, value: _currentBaseUrl);
    notifyListeners();
  }

  Future<bool> checkHealth(String url) async {
    try {
      final testDio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 6),
        receiveTimeout: const Duration(seconds: 6),
      ));
      final normalizedUrl =
          url.endsWith('/') ? url.substring(0, url.length - 1) : url;
      final res = await testDio.get('$normalizedUrl/api/hazards/map');
      return res.statusCode == 200 || res.statusCode == 401;
    } catch (e) {
      try {
        final testDio = Dio(BaseOptions(
          connectTimeout: const Duration(seconds: 4),
          receiveTimeout: const Duration(seconds: 4),
        ));
        final res = await testDio.get(url);
        return res.statusCode != null && res.statusCode! < 500;
      } catch (_) {
        return false;
      }
    }
  }

  // Expose Dio for services to use directly
  Dio get dio => _dio;

  // â”€â”€ Token management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
