import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart' hide Path;
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:dio/dio.dart';

import '../../models/hazard.dart';
import '../../services/hazard_service.dart';

class CitizenMapScreen extends StatefulWidget {
  const CitizenMapScreen({super.key});

  @override
  State<CitizenMapScreen> createState() => _CitizenMapScreenState();
}

class _CitizenMapScreenState extends State<CitizenMapScreen> with TickerProviderStateMixin {
  final MapController _mapController = MapController();
  List<Hazard> _hazards = [];
  bool _loading = true;
  Hazard? _selectedHazard;
  String _selectedFilter = 'All';
  bool _satelliteMode = false;

  // Live User Location
  LatLng? _userLocation;
  bool _locating = false;

  // Directions & Routing state
  List<LatLng> _routePoints = [];
  String? _routeDistance;
  String? _routeDuration;
  bool _calculatingRoute = false;

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
    _determineUserPosition();
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

  Future<void> _determineUserPosition() async {
    setState(() => _locating = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        // Fallback default in Colombo center
        if (mounted) {
          setState(() {
            _userLocation = const LatLng(6.9271, 79.8612);
            _locating = false;
          });
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted) {
            setState(() {
              _userLocation = const LatLng(6.9271, 79.8612);
              _locating = false;
            });
          }
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted) {
          setState(() {
            _userLocation = const LatLng(6.9271, 79.8612);
            _locating = false;
          });
        }
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        timeLimit: const Duration(seconds: 8),
      );

      if (mounted) {
        setState(() {
          _userLocation = LatLng(position.latitude, position.longitude);
          _locating = false;
        });
      }
    } catch (_) {
      // Default fallback in Colombo center
      if (mounted) {
        setState(() {
          _userLocation = const LatLng(6.9271, 79.8612);
          _locating = false;
        });
      }
    }
  }

  // Calculate In-App Route using OSRM road routing engine
  Future<void> _calculateRouteTo(Hazard hazard) async {
    final start = _userLocation ?? const LatLng(6.9271, 79.8612);
    final end = LatLng(hazard.latitude, hazard.longitude);

    setState(() {
      _calculatingRoute = true;
    });

    try {
      final url =
          'https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson';

      final response = await Dio().get(url, options: Options(receiveTimeout: const Duration(seconds: 8)));
      if (response.statusCode == 200 && response.data['routes'] != null && (response.data['routes'] as List).isNotEmpty) {
        final route = response.data['routes'][0];
        final coordinates = route['geometry']['coordinates'] as List;
        final distanceMeters = (route['distance'] as num).toDouble();
        final durationSeconds = (route['duration'] as num).toDouble();

        final points = coordinates.map((c) => LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble())).toList();

        final distanceKm = (distanceMeters / 1000).toStringAsFixed(1);
        final durationMins = (durationSeconds / 60).round();

        if (mounted) {
          setState(() {
            _routePoints = points;
            _routeDistance = '$distanceKm km';
            _routeDuration = '$durationMins mins';
            _calculatingRoute = false;
          });

          // Animate map view to encompass both points
          final bounds = LatLngBounds.fromPoints([start, end, ...points]);
          _mapController.fitCamera(
            CameraFit.bounds(
              bounds: bounds,
              padding: const EdgeInsets.symmetric(horizontal: 50, vertical: 90),
            ),
          );
        }
        return;
      }
    } catch (_) {
      // Fallback: direct line with simulated estimate
    }

    // Direct road interpolation fallback
    final distanceMeters = const Distance().as(LengthUnit.Meter, start, end);
    final distanceKm = (distanceMeters / 1000).toStringAsFixed(1);
    final durationMins = ((distanceMeters / 1000) * 3.5).round().clamp(1, 180);

    if (mounted) {
      setState(() {
        _routePoints = [start, end];
        _routeDistance = '$distanceKm km';
        _routeDuration = '$durationMins mins';
        _calculatingRoute = false;
      });

      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: LatLngBounds.fromPoints([start, end]),
          padding: const EdgeInsets.all(70),
        ),
      );
    }
  }

  void _clearRoute() {
    setState(() {
      _routePoints = [];
      _routeDistance = null;
      _routeDuration = null;
    });
  }

  Future<void> _launchExternalGoogleMaps(Hazard hazard) async {
    final url = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${hazard.latitude},${hazard.longitude}');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
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
    // Official Google Maps Tile servers
    final tileUrl = _satelliteMode
        ? 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' // Google Hybrid Satellite
        : 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'; // Google Roadmap

    return Scaffold(
      body: Stack(
        children: [
          // ── 1. GOOGLE MAPS TILE LAYER + ROUTE + MARKERS ─────────────────────────
          FlutterMap(
            mapController: _mapController,
            options: const MapOptions(
              initialCenter: LatLng(6.9271, 79.8612), // Colombo Center
              initialZoom: 13.0,
              minZoom: 9.0,
              maxZoom: 20.0,
            ),
            children: [
              TileLayer(
                urlTemplate: tileUrl,
                subdomains: const ['0', '1', '2', '3'],
                maxZoom: 20,
              ),

              // Polyline Driving Route (Like Web DirectionsLayer)
              if (_routePoints.isNotEmpty)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: _routePoints,
                      color: const Color(0xFF2563EB), // Signature Google Maps route blue
                      strokeWidth: 5.5,
                      borderColor: Colors.white,
                      borderStrokeWidth: 1.5,
                    ),
                  ],
                ),

              // Markers Layer (Live User Location + Upgraded Google Pins)
              MarkerLayer(
                markers: [
                  // Live User Location Dot (Radar wave + core dot)
                  if (_userLocation != null)
                    Marker(
                      point: _userLocation!,
                      width: 36,
                      height: 36,
                      child: const _LiveUserLocationDot(),
                    ),

                  // Upgraded Hazard Pins matching Google Maps & Web
                  ..._filteredHazards.map((hazard) {
                    final isSelected = _selectedHazard?.id == hazard.id;
                    final isCrit = hazard.isCritical;

                    final markerColor = isCrit
                        ? const Color(0xFFDC2626) // Red Critical
                        : hazard.isResolved
                            ? const Color(0xFF059669) // Emerald Resolved
                            : (hazard.severity.toUpperCase() == 'MEDIUM')
                                ? const Color(0xFFD97706) // Amber Medium
                                : const Color(0xFF2563EB); // Blue In Progress

                    return Marker(
                      point: LatLng(hazard.latitude, hazard.longitude),
                      width: isSelected ? 52 : 40,
                      height: isSelected ? 58 : 46,
                      alignment: Alignment.topCenter,
                      child: GestureDetector(
                        onTap: () {
                          setState(() {
                            _selectedHazard = hazard;
                          });
                          _mapController.move(LatLng(hazard.latitude, hazard.longitude), 14.5);
                        },
                        child: _UpgradedGooglePin(
                          color: markerColor,
                          category: hazard.category,
                          isCritical: isCrit,
                          isSelected: isSelected,
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ],
          ),

          // ── 2. TOP SEARCH BAR & FILTER CHIPS ─────────────────────────────────────
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Search Bar with elevation & refresh button
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
                        const Icon(Icons.search, color: Color(0xFF64748B), size: 22),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Search Colombo Hazards & Hotspots',
                            style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
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
                            icon: const Icon(Icons.refresh, size: 20, color: Color(0xFF2563EB)),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: _loadHazards,
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Filter Categories Row
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
                            selectedColor: const Color(0xFF2563EB),
                            backgroundColor: Colors.white,
                            labelStyle: TextStyle(
                              color: isSel ? Colors.white : const Color(0xFF0F172A),
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

                  // ── 3. ACTIVE ROUTE STATS BANNER (When In-App Route is Calculated) ──
                  if (_routePoints.isNotEmpty)
                    Container(
                      margin: const EdgeInsets.only(top: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.5)),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.3),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF2563EB).withValues(alpha: 0.2),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.navigation_rounded, color: Color(0xFF38BDF8), size: 18),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Text(
                                      _routeDuration ?? '',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      '(${_routeDistance ?? ''})',
                                      style: const TextStyle(
                                        color: Color(0xFF94A3B8),
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                                const Text(
                                  'Fastest driving route via Colombo Grid',
                                  style: TextStyle(color: Color(0xFF38BDF8), fontSize: 10.5, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, color: Colors.white, size: 20),
                            onPressed: _clearRoute,
                            tooltip: 'Clear Route',
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ),

          // ── 4. FLOATING CONTROL BUTTONS (Satellite & Live Location) ─────────────
          Positioned(
            right: 14,
            bottom: _selectedHazard != null ? 230 : 24,
            child: Column(
              children: [
                FloatingActionButton.small(
                  heroTag: 'layer_toggle',
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF0F172A),
                  elevation: 4,
                  onPressed: () {
                    setState(() => _satelliteMode = !_satelliteMode);
                  },
                  tooltip: _satelliteMode ? 'Switch to Street Map' : 'Switch to Satellite',
                  child: Icon(_satelliteMode ? Icons.map_outlined : Icons.satellite_alt_rounded),
                ),
                const SizedBox(height: 8),
                FloatingActionButton.small(
                  heroTag: 'my_location',
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFF2563EB),
                  elevation: 4,
                  onPressed: () {
                    if (_userLocation != null) {
                      _mapController.move(_userLocation!, 15.0);
                    } else {
                      _determineUserPosition();
                    }
                  },
                  tooltip: 'My Live Location',
                  child: _locating
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.my_location_rounded),
                ),
              ],
            ),
          ),

          // ── 5. BOTTOM INSPECTOR SHEET (Matching Website Exactly) ─────────────────
          if (_selectedHazard != null)
            Positioned(
              left: 14,
              right: 14,
              bottom: 16,
              child: Card(
                elevation: 10,
                color: const Color(0xFF0F172A), // Dark slate matching website
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: BorderSide(
                    color: _selectedHazard!.isCritical
                        ? const Color(0xFFEF4444).withValues(alpha: 0.5)
                        : const Color(0xFF334155),
                    width: 1.5,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Top Row: Badges & Close Button
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              // Severity Badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                decoration: BoxDecoration(
                                  color: _selectedHazard!.isCritical
                                      ? const Color(0xFF7F1D1D).withValues(alpha: 0.6)
                                      : const Color(0xFF1E3A8A).withValues(alpha: 0.6),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: _selectedHazard!.isCritical
                                        ? const Color(0xFFEF4444)
                                        : const Color(0xFF3B82F6),
                                  ),
                                ),
                                child: Text(
                                  '${_selectedHazard!.severity.toUpperCase()} SEVERITY',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.bold,
                                    color: _selectedHazard!.isCritical
                                        ? const Color(0xFFFCA5A5)
                                        : const Color(0xFF93C5FD),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              // Category Badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1E293B),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(color: const Color(0xFF475569)),
                                ),
                                child: Text(
                                  _selectedHazard!.category,
                                  style: const TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          IconButton(
                            icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF94A3B8)),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: () => setState(() {
                              _selectedHazard = null;
                              _clearRoute();
                            }),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),

                      // Title
                      Text(
                        _selectedHazard!.title,
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Colors.white),
                      ),
                      const SizedBox(height: 4),

                      // Address
                      Row(
                        children: [
                          const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFFF59E0B)),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _selectedHazard!.locationAddress,
                              style: const TextStyle(fontSize: 12, color: Color(0xFFCBD5E1)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),

                      // GPS Coordinates + Copy Chip
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${_selectedHazard!.latitude.toStringAsFixed(4)}° N, ${_selectedHazard!.longitude.toStringAsFixed(4)}° E',
                            style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Color(0xFF94A3B8)),
                          ),
                          InkWell(
                            onTap: () {
                              Clipboard.setData(ClipboardData(
                                text: '${_selectedHazard!.latitude}, ${_selectedHazard!.longitude}',
                              ));
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Coordinates copied to clipboard')),
                              );
                            },
                            child: const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.copy_rounded, size: 11, color: Color(0xFFF59E0B)),
                                  SizedBox(width: 4),
                                  Text('Copy', style: TextStyle(fontSize: 10.5, color: Color(0xFFF59E0B), fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // ── TWO DIRECTION ACTION BUTTONS (Matching Website) ─────────
                      Row(
                        children: [
                          // 1. Calculate In-App Route
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: _calculatingRoute ? null : () => _calculateRouteTo(_selectedHazard!),
                              icon: _calculatingRoute
                                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF38BDF8)))
                                  : const Icon(Icons.route_rounded, size: 15, color: Color(0xFF38BDF8)),
                              label: const Text(
                                'In-App Route',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: Color(0xFF0284C7)),
                                backgroundColor: const Color(0xFF0369A1).withValues(alpha: 0.2),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),

                          // 2. Navigate via Google Maps
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () => _launchExternalGoogleMaps(_selectedHazard!),
                              icon: const Icon(Icons.navigation_rounded, size: 15, color: Color(0xFF0F172A)),
                              label: const Text(
                                'Google Maps',
                                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFF59E0B), // Signature Amber
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                elevation: 3,
                              ),
                            ),
                          ),
                        ],
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

// ── UPGRADED GOOGLE MAPS PIN (Matching Google Maps AdvancedMarker) ────────────
class _UpgradedGooglePin extends StatelessWidget {
  final Color color;
  final String category;
  final bool isCritical;
  final bool isSelected;

  const _UpgradedGooglePin({
    required this.color,
    required this.category,
    required this.isCritical,
    required this.isSelected,
  });

  IconData _getCategoryIcon() {
    final cat = category.toLowerCase();
    if (cat.contains('pothole') || cat.contains('road')) return Icons.broken_image_outlined;
    if (cat.contains('water') || cat.contains('leak')) return Icons.water_drop_rounded;
    if (cat.contains('traffic') || cat.contains('signal')) return Icons.traffic_rounded;
    if (cat.contains('light') || cat.contains('street')) return Icons.lightbulb_outline_rounded;
    if (cat.contains('drain')) return Icons.waves_rounded;
    if (cat.contains('tree')) return Icons.park_outlined;
    return Icons.warning_amber_rounded;
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.topCenter,
      clipBehavior: Clip.none,
      children: [
        // Selection Halo Ring (Pulse effect when pin is selected)
        if (isSelected)
          Positioned(
            top: 2,
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF3B82F6).withValues(alpha: 0.35),
                border: Border.all(color: const Color(0xFF60A5FA), width: 1.5),
              ),
            ),
          ),

        // Pin Body
        CustomPaint(
          size: Size(isSelected ? 44 : 36, isSelected ? 52 : 42),
          painter: _TeardropMarkerPainter(
            color: color,
            borderColor: Colors.white,
            borderWidth: isSelected ? 2.8 : 2.0,
          ),
          child: SizedBox(
            width: isSelected ? 44 : 36,
            height: isSelected ? 44 : 36,
            child: Center(
              child: Icon(
                _getCategoryIcon(),
                color: Colors.white,
                size: isSelected ? 20 : 16,
              ),
            ),
          ),
        ),

        // Urgent Exclamation Badge on top-right for Critical Hazards (Like Web)
        if (isCritical)
          Positioned(
            top: -2,
            right: isSelected ? 2 : 0,
            child: Container(
              width: 15,
              height: 15,
              decoration: BoxDecoration(
                color: const Color(0xFFFBBF24), // Vibrant gold
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.3),
                    blurRadius: 3,
                  ),
                ],
              ),
              child: const Center(
                child: Text(
                  '!',
                  style: TextStyle(
                    color: Colors.black,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

// Custom Painter for Authentic Google Maps Teardrop Shape
class _TeardropMarkerPainter extends CustomPainter {
  final Color color;
  final Color borderColor;
  final double borderWidth;

  _TeardropMarkerPainter({
    required this.color,
    required this.borderColor,
    required this.borderWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    // Drop shadow at the bottom needle tip
    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: 0.35)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 3.5);
    canvas.drawOval(
      Rect.fromCenter(center: Offset(w / 2, h - 1), width: w * 0.45, height: 4),
      shadowPaint,
    );

    // Teardrop path
    final path = Path();
    path.moveTo(w / 2, h);
    path.cubicTo(w * 0.08, h * 0.62, 0, h * 0.42, 0, w / 2);
    path.arcToPoint(
      Offset(w, w / 2),
      radius: Radius.circular(w / 2),
      clockwise: true,
    );
    path.cubicTo(w, h * 0.42, w * 0.92, h * 0.62, w / 2, h);
    path.close();

    // Fill
    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    canvas.drawPath(path, fillPaint);

    // White Border
    final strokePaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth;
    canvas.drawPath(path, strokePaint);
  }

  @override
  bool shouldRepaint(covariant _TeardropMarkerPainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.borderColor != borderColor ||
        oldDelegate.borderWidth != borderWidth;
  }
}

// ── LIVE USER LOCATION DOT (Radar pulsing wave + solid blue core) ─────────────
class _LiveUserLocationDot extends StatelessWidget {
  const _LiveUserLocationDot();

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Outer pulsing radar wave
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFF3B82F6).withValues(alpha: 0.25),
            border: Border.all(color: const Color(0xFF60A5FA).withValues(alpha: 0.5)),
          ),
        ),
        // Inner solid GPS blue dot
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 2.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.35),
                blurRadius: 4,
              ),
            ],
          ),
        ),
      ],
    );
  }
}
