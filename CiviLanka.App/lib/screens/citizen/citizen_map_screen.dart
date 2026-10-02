import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' hide Path;
import 'package:provider/provider.dart';
import '../../models/hazard.dart';
import '../../services/hazard_service.dart';
import '../../theme/app_colors.dart';

class CitizenMapScreen extends StatefulWidget {
  const CitizenMapScreen({super.key});

  @override
  State<CitizenMapScreen> createState() => _CitizenMapScreenState();
}

class _CitizenMapScreenState extends State<CitizenMapScreen> {
  final MapController _mapController = MapController();
  List<Hazard> _hazards = [];
  bool _loading = true;
  Hazard? _selectedHazard;
  String _selectedFilter = 'All';
  bool _satelliteMode = false;

  final List<String> _filterCategories = [
    'All',
    'Critical',
    'Pothole',
    'Drainage',
    'Streetlight',
    'Water',
  ];

  @override
  void initState() {
    super.initState();
    _loadHazards();
  }

  Future<void> _loadHazards() async {
    setState(() => _loading = true);
    try {
      final list = await context.read<HazardService>().getMapHazards();
      if (mounted) {
        setState(() {
          _hazards = list;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Hazard> get _filteredHazards {
    if (_selectedFilter == 'All') return _hazards;
    if (_selectedFilter == 'Critical') {
      return _hazards.where((h) => h.isCritical).toList();
    }
    return _hazards.where((h) {
      return h.category.toLowerCase().contains(_selectedFilter.toLowerCase());
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final tileUrl = _satelliteMode
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png';

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: const MapOptions(
              initialCenter: LatLng(6.9271, 79.8612),
              initialZoom: 13.0,
              minZoom: 9.0,
              maxZoom: 18.0,
            ),
            children: [
              TileLayer(
                urlTemplate: tileUrl,
                userAgentPackageName: 'com.civilanka.civilanka_app',
                maxZoom: 19,
              ),
              MarkerLayer(
                markers: _filteredHazards.map((hazard) {
                  final isSelected = _selectedHazard?.id == hazard.id;
                  final isCrit = hazard.isCritical;
                  final markerColor = isCrit
                      ? AppColors.critical
                      : hazard.isResolved
                          ? AppColors.success
                          : AppColors.primary;

                  return Marker(
                    point: LatLng(hazard.latitude, hazard.longitude),
                    width: isSelected ? 48 : 38,
                    height: isSelected ? 48 : 38,
                    child: GestureDetector(
                      onTap: () {
                        setState(() => _selectedHazard = hazard);
                        _mapController.move(LatLng(hazard.latitude, hazard.longitude), 14.5);
                      },
                      child: CustomPaint(
                        painter: _GoogleTeardropPainter(
                          color: markerColor,
                          isSelected: isSelected,
                        ),
                        child: Center(
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Icon(
                              isCrit ? Icons.warning : Icons.report_problem,
                              color: Colors.white,
                              size: isSelected ? 20 : 16,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(28),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.12),
                          blurRadius: 10,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.search, color: AppColors.slate500, size: 22),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Search Colombo Hazards & Hotspots',
                            style: TextStyle(color: AppColors.slate500, fontSize: 13),
                          ),
                        ),
                        if (_loading)
                          const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        else
                          IconButton(
                            icon: const Icon(Icons.refresh, size: 20, color: AppColors.primary),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: _loadHazards,
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _filterCategories.map((f) {
                        final isSel = _selectedFilter == f;
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: ChoiceChip(
                            label: Text(f),
                            selected: isSel,
                            selectedColor: AppColors.primary,
                            backgroundColor: Colors.white,
                            labelStyle: TextStyle(
                              color: isSel ? Colors.white : AppColors.textDark,
                              fontSize: 11,
                              fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                            ),
                            elevation: 2,
                            onSelected: (val) {
                              if (val) setState(() => _selectedFilter = f);
                            },
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Positioned(
            right: 14,
            bottom: _selectedHazard != null ? 180 : 24,
            child: Column(
              children: [
                FloatingActionButton.small(
                  heroTag: 'layer_toggle',
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.textDark,
                  onPressed: () {
                    setState(() => _satelliteMode = !_satelliteMode);
                  },
                  child: Icon(_satelliteMode ? Icons.map : Icons.satellite_alt),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: 'recenter_colombo',
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.primary,
                  onPressed: () {
                    _mapController.move(const LatLng(6.9271, 79.8612), 13.0);
                  },
                  child: const Icon(Icons.my_location),
                ),
              ],
            ),
          ),
          if (_selectedHazard != null)
            Positioned(
              left: 14,
              right: 14,
              bottom: 16,
              child: Card(
                elevation: 6,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: _selectedHazard!.isCritical
                                  ? AppColors.critical.withValues(alpha: 0.12)
                                  : AppColors.primary.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              _selectedHazard!.severity.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: _selectedHazard!.isCritical
                                    ? AppColors.critical
                                    : AppColors.primary,
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close, size: 20),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: () => setState(() => _selectedHazard = null),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _selectedHazard!.title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _selectedHazard!.locationAddress,
                        style: const TextStyle(fontSize: 12, color: AppColors.slate500),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _selectedHazard!.description,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: AppColors.slate700),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _GoogleTeardropPainter extends CustomPainter {
  final Color color;
  final bool isSelected;

  _GoogleTeardropPainter({required this.color, required this.isSelected});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.3)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3);

    final path = Path();
    final w = size.width;
    final h = size.height;

    final shadowPath = Path();
    shadowPath.addOval(Rect.fromCenter(center: Offset(w / 2, h - 2), width: w * 0.5, height: 4));
    canvas.drawPath(shadowPath, shadowPaint);

    path.moveTo(w / 2, h);
    path.cubicTo(w * 0.1, h * 0.6, 0, h * 0.4, 0, w / 2);
    path.arcToPoint(
      Offset(w, w / 2),
      radius: Radius.circular(w / 2),
      clockwise: true,
    );
    path.cubicTo(w, h * 0.4, w * 0.9, h * 0.6, w / 2, h);
    path.close();

    canvas.drawPath(path, paint);

    if (isSelected) {
      final borderPaint = Paint()
        ..color = Colors.white
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.5;
      canvas.drawPath(path, borderPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
