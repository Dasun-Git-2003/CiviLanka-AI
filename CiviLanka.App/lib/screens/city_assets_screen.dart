// CiviLanka.App/lib/screens/city_assets_screen.dart
// Member 2: Infrastructure Asset Registry & City GIS Overview

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';

class CityAssetsScreen extends StatefulWidget {
  const CityAssetsScreen({super.key});

  @override
  State<CityAssetsScreen> createState() => _CityAssetsScreenState();
}

class _CityAssetsScreenState extends State<CityAssetsScreen> {
  List<dynamic> _assets = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadAssets();
  }

  Future<void> _loadAssets() async {
    setState(() => _isLoading = true);
    final api = context.read<ApiService>();
    try {
      final res = await api.dio.get('/api/assets');
      if (res.statusCode == 200 && res.data != null) {
        setState(() {
          _assets = res.data['data'] as List<dynamic>;
          _isLoading = false;
        });
        return;
      }
    } catch (_) {
      // Fallback sample assets
      setState(() {
        _assets = [
          {'id': 401, 'name': 'Main Water Distribution Trunk #2', 'category': 'WATER', 'condition': 'FAIR', 'road': "St. Anthony's Lane", 'lat': 6.9082, 'lng': 79.8524},
          {'id': 402, 'name': 'A2 Galle Road Arterial Corridor', 'category': 'ROADWAY', 'condition': 'CRITICAL', 'road': 'Galle Road, Kollupitiya', 'lat': 6.9147, 'lng': 79.8510},
          {'id': 403, 'name': 'Duplication Road Stormwater Box Culvert', 'category': 'DRAINAGE', 'condition': 'GOOD', 'road': 'Duplication Road', 'lat': 6.8920, 'lng': 79.8567},
          {'id': 404, 'name': 'Park Road Municipal Streetlight Grid', 'category': 'ELECTRICAL', 'condition': 'FAIR', 'road': 'Park Road, Colombo 05', 'lat': 6.8856, 'lng': 79.8654},
          {'id': 407, 'name': 'New Kelani Bridge Crash Barrier Sections', 'category': 'BRIDGE', 'condition': 'GOOD', 'road': 'New Kelani Bridge Road', 'lat': 6.9532, 'lng': 79.8791},
        ];
        _isLoading = false;
      });
    }
  }

  Color _getConditionColor(String? condition) {
    switch (condition?.toUpperCase()) {
      case 'CRITICAL':
        return Colors.red;
      case 'POOR':
        return Colors.deepOrange;
      case 'FAIR':
        return Colors.amber.shade800;
      case 'GOOD':
        return Colors.green;
      default:
        return Colors.blue;
    }
  }

  IconData _getCategoryIcon(String? category) {
    switch (category?.toUpperCase()) {
      case 'WATER':
        return Icons.water_drop;
      case 'ROADWAY':
        return Icons.add_road;
      case 'DRAINAGE':
        return Icons.waves;
      case 'ELECTRICAL':
        return Icons.lightbulb_outline;
      case 'BRIDGE':
        return Icons.architecture;
      default:
        return Icons.location_city;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('City Infrastructure Assets (M2)'),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAssets,
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _assets.length,
              itemBuilder: (ctx, i) {
                final item = _assets[i];
                final condition = item['condition']?.toString() ?? 'FAIR';
                final color = _getConditionColor(condition);

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(_getCategoryIcon(item['category']), color: color, size: 24),
                    ),
                    title: Text(
                      item['name']?.toString() ?? 'Asset #${item['id']}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(item['road']?.toString() ?? '', style: const TextStyle(fontSize: 12)),
                        const SizedBox(height: 2),
                        Text(
                          'Coords: ${item['lat']}, ${item['lng']}',
                          style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                    trailing: Chip(
                      label: Text(condition, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color)),
                      backgroundColor: color.withOpacity(0.1),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
