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

class _ConditionFilterOption {
  final String key;
  final String label;
  final Color dotColor;

  const _ConditionFilterOption({
    required this.key,
    required this.label,
    required this.dotColor,
  });
}

class _CitizenMapScreenState extends State<CitizenMapScreen> with TickerProviderStateMixin {
  final MapController _mapController = MapController();
  List<Hazard> _hazards = [];
  bool _loading = true;
  Hazard? _selectedHazard;
  String _conditionFilter = 'all'; // 'all', 'poor', 'fair', 'good'
  String _categoryFilter = 'All';
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _satelliteMode = false;

  // Live User Location
  LatLng? _userLocation;
  bool _locating = false;

  // Directions & Routing state
  List<LatLng> _routePoints = [];
  String? _routeDistance;
  String? _routeDuration;
  bool _calculatingRoute = false;

  static const List<_ConditionFilterOption> _conditionFilters = [
    _ConditionFilterOption(key: 'all', label: 'All', dotColor: Color(0xFF94A3B8)),
    _ConditionFilterOption(key: 'poor', label: 'Critical / Poor', dotColor: Color(0xFFDC2626)),
    _ConditionFilterOption(key: 'fair', label: 'Moderate', dotColor: Color(0xFFD97706)),
    _ConditionFilterOption(key: 'good', label: 'Good / Safe', dotColor: Color(0xFF059669)),
  ];

  static const List<String> _categoryFilterOptions = [
    'All',
    'Pothole',
    'Drainage',
    'Streetlight',
    'Water',
    'Road Damage',
    'Fallen Tree',
  ];

  @override
  void initState() {
    super.initState();
    _loadHazards();
    _determineUserPosition();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
        locationSettings: const LocationSettings(timeLimit: Duration(seconds: 8)),
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

  String _getHazardCondition(Hazard h) {
    final sev = h.severity.toUpperCase();
    final stat = h.status.toLowerCase();
    final isResolved = stat == 'resolved' || stat == 'closed';
    if (isResolved) return 'good';
    if (sev == 'CRITICAL' || sev == 'HIGH') return 'poor';
    if (sev == 'LOW') return 'good';
    return 'fair';
  }

  List<Hazard> get _filteredHazards {
    return _hazards.where((h) {
      // 1. Condition filter ('all', 'poor', 'fair', 'good')
      if (_conditionFilter != 'all') {
        final cond = _getHazardCondition(h);
        if (cond != _conditionFilter) return false;
      }

      // 2. Category filter ('All', 'Pothole', etc.)
      if (_categoryFilter != 'All') {
        final cat = h.category.toLowerCase();
        final sel = _categoryFilter.toLowerCase();
        if (!cat.contains(sel)) return false;
      }

      // 3. Search query filter
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.trim().toLowerCase();
        final matchTicket = h.ticketNumber.toLowerCase().contains(q);
        final matchCat = h.category.toLowerCase().contains(q);
        final matchAddr = h.locationAddress.toLowerCase().contains(q);
        final matchTitle = h.title.toLowerCase().contains(q);
        final matchDesc = h.description.toLowerCase().contains(q);
        if (!matchTicket && !matchCat && !matchAddr && !matchTitle && !matchDesc) {
          return false;
        }
      }

      return true;
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
              // Markers Layer (Live User Location + Upgraded Google Pins)
              MarkerLayer(
                markers: [
                  // Live User Location Dot (Animated radar wave + GPS core dot)
                  if (_userLocation != null)
                    Marker(
                      point: _userLocation!,
                      width: 44,
                      height: 44,
                      alignment: Alignment.center,
                      child: const _LiveUserLocationDot(),
                    ),

                  // Upgraded Hazard Pins matching user screenshot 1:1
                  ..._filteredHazards.map((hazard) {
                    final isSelected = _selectedHazard?.id == hazard.id;
                    final cond = _getHazardCondition(hazard);
                    final markerColor = cond == 'poor'
                        ? const Color(0xFFDC2626) // Red Critical / Poor
                        : cond == 'good'
                            ? const Color(0xFF059669) // Emerald Green Good / Safe
                            : const Color(0xFFD97706); // Orange / Amber Moderate

                    return Marker(
                      point: LatLng(hazard.latitude, hazard.longitude),
                      width: isSelected ? 34 : 26,
                      height: isSelected ? 46 : 36,
                      alignment: Alignment.bottomCenter,
                      child: GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () {
                          setState(() {
                            _selectedHazard = hazard;
                          });
                          _mapController.move(LatLng(hazard.latitude, hazard.longitude), 15.0);
                        },
                        child: _UpgradedGooglePin(
                          color: markerColor,
                          isSelected: isSelected,
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ],
          ),

          // ── 2. TOP SEARCH BAR & CONDITION / CATEGORY FILTERS ───────────────────
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Search Bar with live search, clear X, and refresh button
                  Container(
                    height: 44,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.10),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.search_rounded, color: Color(0xFF64748B), size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            onChanged: (val) {
                              setState(() => _searchQuery = val);
                            },
                            decoration: const InputDecoration(
                              hintText: 'Search pins or tickets...',
                              hintStyle: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                            style: const TextStyle(
                              fontSize: 13,
                              color: Color(0xFF0F172A),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        if (_searchQuery.isNotEmpty)
                          GestureDetector(
                            onTap: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                            child: const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 4),
                              child: Icon(Icons.close_rounded, size: 18, color: Color(0xFF94A3B8)),
                            ),
                          ),
                        const SizedBox(width: 4),
                        if (_loading)
                          const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        else
                          IconButton(
                            icon: const Icon(Icons.refresh_rounded, size: 20, color: Color(0xFF2563EB)),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            onPressed: _loadHazards,
                            tooltip: 'Refresh pins',
                          ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Primary CONDITION Filter Row (Matching Website & User Screenshots 1:1)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: [
                        // "CONDITION:" prefix label
                        Container(
                          padding: const EdgeInsets.only(left: 2, right: 6),
                          child: const Text(
                            'CONDITION:',
                            style: TextStyle(
                              color: Color(0xFF475569),
                              fontSize: 10.5,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ),
                        ..._conditionFilters.map((c) => _buildConditionChip(c)),
                      ],
                    ),
                  ),

                  const SizedBox(height: 6),

                  // Secondary Category Filter Row (Pothole, Drainage, Streetlight, Water, etc.)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    physics: const BouncingScrollPhysics(),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.only(left: 2, right: 6),
                          child: const Text(
                            'CATEGORY:',
                            style: TextStyle(
                              color: Color(0xFF64748B),
                              fontSize: 9.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ),
                        ..._categoryFilterOptions.map((cat) => _buildCategoryChip(cat)),
                      ],
                    ),
                  ),

                  const SizedBox(height: 6),

                  // Status Counter & Legend Bar
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.95),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 4,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            'Showing ${_filteredHazards.length} of ${_hazards.length} markers on Colombo map',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF475569),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _buildLegendDot(const Color(0xFFDC2626), 'Critical'),
                            const SizedBox(width: 8),
                            _buildLegendDot(const Color(0xFFD97706), 'Moderate'),
                            const SizedBox(width: 8),
                            _buildLegendDot(const Color(0xFF059669), 'Resolved'),
                          ],
                        ),
                      ],
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

  Widget _buildConditionChip(_ConditionFilterOption c) {
    final isSel = _conditionFilter == c.key;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: InkWell(
        onTap: () {
          setState(() {
            _conditionFilter = c.key;
          });
        },
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
          decoration: BoxDecoration(
            color: isSel ? const Color(0xFF2563EB) : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSel ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: isSel ? 0.2 : 0.08),
                blurRadius: isSel ? 5 : 3,
                offset: const Offset(0, 1.5),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (isSel) ...[
                const Icon(Icons.check_rounded, color: Colors.white, size: 13),
                const SizedBox(width: 4),
              ] else ...[
                Container(
                  width: 7.5,
                  height: 7.5,
                  decoration: BoxDecoration(
                    color: c.dotColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
              ],
              Text(
                c.label,
                style: TextStyle(
                  color: isSel ? Colors.white : const Color(0xFF0F172A),
                  fontSize: 11.5,
                  fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryChip(String cat) {
    final isSel = _categoryFilter == cat;
    return Padding(
      padding: const EdgeInsets.only(right: 5),
      child: InkWell(
        onTap: () {
          setState(() {
            _categoryFilter = cat;
          });
        },
        borderRadius: BorderRadius.circular(8),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
          decoration: BoxDecoration(
            color: isSel ? const Color(0xFF0F172A) : Colors.white.withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isSel ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
              width: 1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 3,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: Text(
            cat,
            style: TextStyle(
              color: isSel ? Colors.white : const Color(0xFF334155),
              fontSize: 10.5,
              fontWeight: isSel ? FontWeight.w800 : FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLegendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 3.5),
        Text(
          label,
          style: const TextStyle(
            fontSize: 9.5,
            fontWeight: FontWeight.w600,
            color: Color(0xFF64748B),
          ),
        ),
      ],
    );
  }
}

// ── AUTHENTIC GOOGLE MAPS PIN (Matching Google Maps AdvancedMarker <Pin />) ──
class _UpgradedGooglePin extends StatelessWidget {
  final Color color;
  final bool isSelected;

  const _UpgradedGooglePin({
    required this.color,
    this.isSelected = false,
  });

  @override
  Widget build(BuildContext context) {
    final pinWidth = isSelected ? 34.0 : 26.0;
    final pinHeight = isSelected ? 46.0 : 36.0;

    return SizedBox(
      width: pinWidth,
      height: pinHeight,
      child: CustomPaint(
        size: Size(pinWidth, pinHeight),
        painter: _GooglePinPainter(
          color: color,
          borderColor: Colors.white,
          borderWidth: isSelected ? 2.2 : 1.8,
          isSelected: isSelected,
        ),
      ),
    );
  }
}

// Custom Painter for Authentic Google Maps Pin with Solid White Center Dot
class _GooglePinPainter extends CustomPainter {
  final Color color;
  final Color borderColor;
  final double borderWidth;
  final bool isSelected;

  _GooglePinPainter({
    required this.color,
    required this.borderColor,
    required this.borderWidth,
    this.isSelected = false,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final r = w / 2;

    // Contact drop shadow directly below the needle point on the ground
    final shadowPaint = Paint()
      ..color = Colors.black.withValues(alpha: isSelected ? 0.45 : 0.32)
      ..maskFilter = MaskFilter.blur(BlurStyle.normal, isSelected ? 3.0 : 2.0);
    canvas.drawOval(
      Rect.fromCenter(
        center: Offset(w / 2, h - 1.0),
        width: w * 0.54,
        height: isSelected ? 5.5 : 4.0,
      ),
      shadowPaint,
    );

    // Exact Google Maps AdvancedMarker teardrop path
    final path = Path();
    path.moveTo(w / 2, h - 2); // Bottom needle tip
    path.cubicTo(w * 0.08, h * 0.58, 0, h * 0.40, 0, r);
    path.arcToPoint(
      Offset(w, r),
      radius: Radius.circular(r),
      clockwise: true,
    );
    path.cubicTo(w, h * 0.40, w * 0.92, h * 0.58, w / 2, h - 2);
    path.close();

    // Fill with solid vibrant color (matching Google Maps AdvancedMarker fill)
    final fillPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    canvas.drawPath(path, fillPaint);

    // Crisp White Outline Border
    final strokePaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = borderWidth;
    canvas.drawPath(path, strokePaint);

    // Solid Circular White Glyph Dot in the exact center of the pin head (matching media screenshot)
    final dotPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    final dotRadius = r * 0.38;
    canvas.drawCircle(Offset(w / 2, r), dotRadius, dotPaint);
  }

  @override
  bool shouldRepaint(covariant _GooglePinPainter oldDelegate) {
    return oldDelegate.color != color ||
        oldDelegate.borderColor != borderColor ||
        oldDelegate.borderWidth != borderWidth ||
        oldDelegate.isSelected != isSelected;
  }
}


// ── LIVE USER LOCATION DOT (Animated Pulsing Radar Wave + Core GPS Dot) ────────
class _LiveUserLocationDot extends StatefulWidget {
  const _LiveUserLocationDot();

  @override
  State<_LiveUserLocationDot> createState() => _LiveUserLocationDotState();
}

class _LiveUserLocationDotState extends State<_LiveUserLocationDot>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animController,
      builder: (context, child) {
        final val = _animController.value;
        return SizedBox(
          width: 44,
          height: 44,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Outer pulsing radar wave (expands and fades)
              Container(
                width: 14 + (val * 28),
                height: 14 + (val * 28),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF2563EB).withValues(alpha: (1.0 - val) * 0.35),
                  border: Border.all(
                    color: const Color(0xFF60A5FA).withValues(alpha: (1.0 - val) * 0.6),
                    width: 1.5,
                  ),
                ),
              ),
              // Soft inner blue halo
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF3B82F6).withValues(alpha: 0.2),
                ),
              ),
              // Google Maps Core Solid Blue Dot
              Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: const Color(0xFF1D4ED8),
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2.4),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.35),
                      blurRadius: 4,
                      offset: const Offset(0, 1),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

