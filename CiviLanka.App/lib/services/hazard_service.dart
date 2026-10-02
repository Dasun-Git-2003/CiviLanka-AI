import 'dart:io';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import '../models/hazard.dart';
import 'api_service.dart';

class HazardService {
  final ApiService _api;

  HazardService(this._api);

  Future<List<Hazard>> getMyHazards() async {
    try {
      final response = await _api.dio.get('/api/hazards/my');
      final List<dynamic> data = response.data as List<dynamic>;
      return data.map((json) => Hazard.fromJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<Hazard>> getAllHazards({
    String? status,
    String? severity,
    String? category,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (status != null && status.isNotEmpty && status != 'All') {
        queryParams['status'] = status;
      }
      if (severity != null && severity.isNotEmpty && severity != 'All') {
        queryParams['severity'] = severity;
      }
      if (category != null && category.isNotEmpty && category != 'All') {
        queryParams['category'] = category;
      }
      final response = await _api.dio.get('/api/hazards', queryParameters: queryParams);
      final List<dynamic> data = response.data as List<dynamic>;
      return data.map((json) => Hazard.fromJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Hazard> getHazardById(String id) async {
    try {
      final response = await _api.dio.get('/api/hazards/$id');
      return Hazard.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<Hazard>> getMapHazards({
    String? category,
    String? severity,
    String? status,
  }) async {
    try {
      final queryParams = <String, dynamic>{};
      if (category != null && category.isNotEmpty && category != 'All') {
        queryParams['category'] = category;
      }
      if (severity != null && severity.isNotEmpty && severity != 'All') {
        queryParams['severity'] = severity;
      }
      if (status != null && status.isNotEmpty && status != 'All') {
        queryParams['status'] = status;
      }

      final response = await _api.dio.get(
        '/api/hazards/map',
        queryParameters: queryParams,
      );
      final List<dynamic> data = response.data as List<dynamic>;
      return data.map((json) => Hazard.fromJson(json as Map<String, dynamic>)).toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<Hazard> createHazard({
    required String title,
    required String description,
    required String category,
    required String severity,
    required double latitude,
    required double longitude,
    required String locationAddress,
    String? imageUrl,
  }) async {
    try {
      final response = await _api.dio.post(
        '/api/hazards',
        data: {
          'title': title,
          'description': description,
          'category': category,
          'severity': severity,
          'latitude': latitude,
          'longitude': longitude,
          'locationAddress': locationAddress,
          if (imageUrl != null) 'imageUrl': imageUrl,
        },
      );
      return Hazard.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }

  Future<String?> uploadImage(File file) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          file.path,
          filename: 'hazard_photo_${DateTime.now().millisecondsSinceEpoch}.jpg',
        ),
      });

      final response = await _api.dio.post(
        '/api/hazards/upload-image',
        data: formData,
      );
      return response.data['url'] as String? ?? response.data['imageUrl'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<String?> uploadImages(List<File> files) async {
    if (files.isEmpty) return null;
    if (files.length == 1) return uploadImage(files.first);
    try {
      final multipartFiles = <MultipartFile>[];
      for (final f in files) {
        multipartFiles.add(await MultipartFile.fromFile(
          f.path,
          filename: 'hazard_${DateTime.now().millisecondsSinceEpoch}_${multipartFiles.length}.jpg',
        ));
      }
      final formData = FormData.fromMap({
        'files': multipartFiles,
      });
      final response = await _api.dio.post(
        '/api/hazards/upload-images',
        data: formData,
      );
      return response.data['imageUrl'] as String? ?? response.data['url'] as String?;
    } catch (_) {
      return uploadImage(files.first);
    }
  }

  Future<String?> uploadXFiles(List<XFile> files) async {
    if (files.isEmpty) return null;
    try {
      final multipartFiles = <MultipartFile>[];
      for (int i = 0; i < files.length; i++) {
        final f = files[i];
        final bytes = await f.readAsBytes();
        multipartFiles.add(MultipartFile.fromBytes(
          bytes,
          filename: f.name.isNotEmpty ? f.name : 'hazard_${DateTime.now().millisecondsSinceEpoch}_$i.jpg',
        ));
      }
      final formData = FormData.fromMap({
        'files': multipartFiles,
      });
      final response = await _api.dio.post(
        '/api/hazards/upload-images',
        data: formData,
      );
      return response.data['imageUrl'] as String? ?? response.data['url'] as String?;
    } catch (_) {
      try {
        final f = files.first;
        final bytes = await f.readAsBytes();
        final formData = FormData.fromMap({
          'file': MultipartFile.fromBytes(
            bytes,
            filename: f.name.isNotEmpty ? f.name : 'hazard_${DateTime.now().millisecondsSinceEpoch}.jpg',
          ),
        });
        final response = await _api.dio.post('/api/hazards/upload-image', data: formData);
        return response.data['imageUrl'] as String? ?? response.data['url'] as String?;
      } catch (_) {
        return null;
      }
    }
  }

  String _handleError(DioException e) {
    final data = e.response?.data;
    if (data is Map && data.containsKey('message')) {
      return data['message'] as String;
    }
    return 'Failed to load hazard information.';
  }
}
