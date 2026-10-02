import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../models/hazard.dart';
import '../models/infrastructure_asset.dart';
import '../services/hazard_service.dart';

class GisMapScreen extends StatefulWidget {
  final List<Hazard>? initialHazards;
  final List<InfrastructureAsset>? initialAssets;

  const GisMapScreen({
    super.key,
    this.initialHazards,
    this.initialAssets,
  });

  @override
  State<GisMapScreen> createState() => _GisMapScreenState();
}

class _GisMapScreenState extends State<GisMapScreen> {
  final MapController _mapController = MapController();
  List<Hazard> _hazards = [];
  List<InfrastructureAsset> _assets = [];
  bool _loading = false;
  String _filter = 'all'; // 'all', 'hazards', 'assets', 'critical'
  dynamic _selectedPin; // Hazard or InfrastructureAsset

  @override
  void initState() {
    super.initState();
    if (widget.initialHazards != null && widget.initialAssets != null) {
      _hazards = widget.initialHazards!;
      _assets = widget.initialAssets!;
    } else {
      _loadData();
    }
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final hazardService = context.read<HazardService>();
      final stats = await hazardService.getSupervisorStats();
      if (mounted) {
        setState(() {
          _hazards = stats.hazards;
          _assets = stats.assets;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Marker> _buildMarkers(bool isDark) {
    final List<Marker> markers = [];

    // 1. Hazard markers
    if (_filter == 'all' || _filter == 'hazards' || _filter == 'critical') {
      for (final h in _hazards) {
        if (h.latitude == null || h.longitude == null || h.isCancelled) continue;
        final isCritical = (h.severity ?? '').toUpperCase() == 'CRITICAL' ||
            (h.severity ?? '').toUpperCase() == 'HIGH' ||
            (h.priority ?? '').toUpperCase() == 'URGENT';
        if (_filter == 'critical' && !isCritical) continue;

        final color = isCritical
            ? const Color(0xFFDC2626) // Red
            : (h.severity ?? '').toUpperCase() == 'MEDIUM'
                ? const Color(0xFFD97706) // Amber
                : const Color(0xFF059669); // Emerald

        markers.add(
          Marker(
            point: LatLng(h.latitude!, h.longitude!),
            width: 44,
            height: 44,
            child: GestureDetector(
              onTap: () => setState(() => _selectedPin = h),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.white, width: 2.5),
                  boxShadow: [
                    BoxShadow(
                      color: color.withValues(alpha: 0.4),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                child: Icon(
                  isCritical ? Icons.warning_amber_rounded : Icons.report_problem_outlined,
                  color: Colors.white,
                  size: 22,
                ),
              ),
            ),
          ),
        );
      }
    }

    // 2. Infrastructure Asset markers
    if (_filter == 'all' || _filter == 'assets') {
      for (final a in _assets) {
        if (a.latitude == null || a.longitude == null) continue;
        final cond = (a.latestCondition ?? '').toLowerCase();
        final color = cond == 'poor'
            ? const Color(0xFFEF4444)
            : cond == 'fair'
                ? const Color(0xFFF59E0B)
                : const Color(0xFF10B981);

        markers.add(
          Marker(
            point: LatLng(a.latitude!, a.longitude!),
            width: 42,
            height: 42,
            child: GestureDetector(
              onTap: () => setState(() => _selectedPin = a),
              child: Container(
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: color.withValues(alpha: 0.35),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.apartment_outlined,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
          ),
        );
      }
    }

    return markers;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final markers = _buildMarkers(isDark);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Asset GIS Infrastructure Map'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Pins',
            onPressed: _loadData,
          ),
        ],
      ),
      body: Stack(
        children: [
          // FlutterMap OpenStreetMap
          FlutterMap(
            mapController: _mapController,
            options: const MapOptions(
              initialCenter: LatLng(6.9271, 79.8612), // Colombo center
              initialZoom: 12.5,
              minZoom: 5.0,
              maxZoom: 18.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                userAgentPackageName: 'lk.gov.civilanka.app',
              ),
              MarkerLayer(markers: markers),
            ],
          ),

          // Top Filter Bar
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _filterChip('all', 'All Active Pins (${markers.length})', Icons.layers_outlined),
                  const SizedBox(width: 8),
                  _filterChip('hazards', 'Citizen Hazards (${_hazards.length})', Icons.warning_amber_outlined),
                  const SizedBox(width: 8),
                  _filterChip('critical', 'Critical / Urgent', Icons.shield_outlined),
                  const SizedBox(width: 8),
                  _filterChip('assets', 'Assets (${_assets.length})', Icons.account_balance_outlined),
                ],
              ),
            ),
          ),

          if (_loading)
            const Positioned(
              top: 70,
              left: 0,
              right: 0,
              child: Center(
                child: Card(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                        SizedBox(width: 10),
                        Text('Syncing pins from database...', style: TextStyle(fontSize: 12)),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          // Selected Marker Detail Sheet
          if (_selectedPin != null)
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: _buildPinDetailCard(_selectedPin!, isDark),
            ),
        ],
      ),
    );
  }

  Widget _filterChip(String id, String label, IconData icon) {
    final active = _filter == id;
    return ChoiceChip(
      avatar: Icon(icon, size: 16, color: active ? Colors.white : Colors.grey[700]),
      label: Text(label),
      selected: active,
      selectedColor: const Color(0xFFF59E0B),
      onSelected: (_) => setState(() => _filter = id),
      labelStyle: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: active ? Colors.white : Colors.black87,
      ),
    );
  }

  Widget _buildPinDetailCard(dynamic pin, bool isDark) {
    final isHazard = pin is Hazard;
    final title = isHazard ? '${pin.ticketNumber} — ${pin.category}' : (pin as InfrastructureAsset).name;
    final sub = isHazard ? (pin.description) : (pin.location);
    final status = isHazard ? pin.status : pin.status;
    final severityOrCond = isHazard ? (pin.severity ?? 'MEDIUM') : (pin.latestCondition ?? 'Fair');

    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: isHazard ? Colors.amber.withValues(alpha: 0.15) : Colors.blue.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    isHazard ? Icons.report_problem_outlined : Icons.account_balance_outlined,
                    color: isHazard ? const Color(0xFFF59E0B) : const Color(0xFF2563EB),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      Text(sub, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 18),
                  onPressed: () => setState(() => _selectedPin = null),
                ),
              ],
            ),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Status: $status', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: (severityOrCond == 'CRITICAL' || severityOrCond == 'Poor')
                        ? Colors.red.withValues(alpha: 0.15)
                        : Colors.amber.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    severityOrCond,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: (severityOrCond == 'CRITICAL' || severityOrCond == 'Poor')
                          ? Colors.red[700]
                          : Colors.amber[800],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
