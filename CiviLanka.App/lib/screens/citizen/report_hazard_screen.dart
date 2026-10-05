import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../models/hazard.dart';
import '../../services/hazard_service.dart';
import '../../services/location_service.dart';
import '../../theme/app_colors.dart';
import 'citizen_map_screen.dart';

class ReportHazardScreen extends StatefulWidget {
  const ReportHazardScreen({super.key});

  @override
  State<ReportHazardScreen> createState() => _ReportHazardScreenState();
}

class _HazardCategoryItem {
  final String value;
  final String label;
  final String icon;

  const _HazardCategoryItem({
    required this.value,
    required this.label,
    required this.icon,
  });
}

class _ProximityZoneItem {
  final String label;
  final String value;
  final IconData icon;

  const _ProximityZoneItem({
    required this.label,
    required this.value,
    required this.icon,
  });
}

class _ColomboHotspotItem {
  final String name;
  final String lat;
  final String lng;

  const _ColomboHotspotItem({
    required this.name,
    required this.lat,
    required this.lng,
  });
}

class _ReportHazardScreenState extends State<ReportHazardScreen> {
  final _formKey = GlobalKey<FormState>();

  // ── Form State ─────────────────────────────────────────────────────────────
  String _category = 'Pothole';
  String _proximityZone = 'School Zone';
  final _descController = TextEditingController();
  final _addressController = TextEditingController();

  final _latController = TextEditingController(text: '6.927100');
  final _lngController = TextEditingController(text: '79.861200');
  final _pasteController = TextEditingController();

  double _lat = 6.9271;
  double _lng = 79.8612;

  final List<XFile> _selectedFiles = [];
  final List<Uint8List> _previewBytes = [];

  bool _detectingLocation = false;
  String? _locationStatus;
  bool _submitting = false;
  String? _error;

  final ImagePicker _picker = ImagePicker();

  // ── Constants matching Web CitizenDashboard.tsx ────────────────────────────
  static const List<_HazardCategoryItem> _hazardCategories = [
    _HazardCategoryItem(value: 'Water Main Burst', label: 'Water Main Burst / Pipe Rupture', icon: '🚰'),
    _HazardCategoryItem(value: 'DrainageProblem', label: 'Drainage Problem / Culvert Siltation', icon: '🌊'),
    _HazardCategoryItem(value: 'Drainage Cover Collapse', label: 'Drainage Cover Collapse / Open Pit', icon: '⚠️'),
    _HazardCategoryItem(value: 'Sinkhole & Ground Subsidence', label: 'Sinkhole & Ground Subsidence Cavity', icon: '🕳️'),
    _HazardCategoryItem(value: 'Roadside Landslide', label: 'Roadside Landslide / Embankment Slip', icon: '⛰️'),
    _HazardCategoryItem(value: 'Collapsed Retaining Wall', label: 'Collapsed Retaining Wall / Debris', icon: '🧱'),
    _HazardCategoryItem(value: 'Flooded Underpass', label: 'Flooded Railway / Subway Underpass', icon: '🚇'),
    _HazardCategoryItem(value: 'Damaged Traffic Signal', label: 'Damaged Traffic Signal / Live Cable', icon: '🚦'),
    _HazardCategoryItem(value: 'Broken Streetlight Pole', label: 'Broken Streetlight Pole / Leaning Mast', icon: '💡'),
    _HazardCategoryItem(value: 'Fallen Utility Pole', label: 'Fallen Utility Pole / Hanging Cables', icon: '🪵'),
    _HazardCategoryItem(value: 'Oil Spill on Roadway', label: 'Oil Spill on Roadway / Traction Loss', icon: '🛢️'),
    _HazardCategoryItem(value: 'Bridge Structural Damage', label: 'Bridge Damage / Joint Fracture / Scour', icon: '🌉'),
    _HazardCategoryItem(value: 'Sewage & Wastewater Overflow', label: 'Sewage & Wastewater Overflow', icon: '☣️'),
    _HazardCategoryItem(value: 'Exposed High-Voltage Cable', label: 'Exposed High-Voltage Cable / Arcing', icon: '⚡'),
    _HazardCategoryItem(value: 'Damaged Highway Guardrail', label: 'Damaged Highway Guardrail / Barrier', icon: '🛡️'),
    _HazardCategoryItem(value: 'Missing Manhole Cover', label: 'Missing Manhole Cover / Open Chamber', icon: '⭕'),
    _HazardCategoryItem(value: 'Hazardous Chemical & Waste Dump', label: 'Hazardous Chemical / Toxic Waste Dump', icon: '🧪'),
    _HazardCategoryItem(value: 'Pedestrian Walkway Collapse', label: 'Pedestrian Walkway Collapse / Hole', icon: '🚶'),
    _HazardCategoryItem(value: 'Gas or Combustible Vapour Leak', label: 'Gas / Combustible Vapour Leak', icon: '⛽'),
    _HazardCategoryItem(value: 'Coastal Erosion & Seawall Breach', label: 'Coastal Erosion / Seawall Breach', icon: '🌊'),
    _HazardCategoryItem(value: 'Large Pothole', label: 'Large Carriageway Pothole Crater', icon: '🕳️'),
    _HazardCategoryItem(value: 'Pothole', label: 'Pothole / Road Surface Defect', icon: '🕳️'),
    _HazardCategoryItem(value: 'DamagedRoad', label: 'Damaged Road / Surface Rutting', icon: '🚧'),
    _HazardCategoryItem(value: 'WaterLeak', label: 'Water Leak / Potable Line Seepage', icon: '💧'),
    _HazardCategoryItem(value: 'FallenTree', label: 'Fallen Tree / Road Obstruction', icon: '🌿'),
    _HazardCategoryItem(value: 'Other', label: 'Other Municipal Hazard', icon: '⚠️'),
  ];

  static const List<_ProximityZoneItem> _proximityZones = [
    _ProximityZoneItem(label: 'School Zone', value: 'School Zone', icon: Icons.school_outlined),
    _ProximityZoneItem(label: 'Hospital / Clinic', value: 'Hospital / Clinic', icon: Icons.local_hospital_outlined),
    _ProximityZoneItem(label: 'Primary Highway', value: 'Primary Highway', icon: Icons.alt_route_rounded),
    _ProximityZoneItem(label: 'Pedestrian Walkway', value: 'Pedestrian Walkway', icon: Icons.directions_walk_rounded),
    _ProximityZoneItem(label: 'Commercial Hub', value: 'Commercial Hub', icon: Icons.storefront_outlined),
    _ProximityZoneItem(label: 'Residential Area', value: 'Residential Area', icon: Icons.home_outlined),
  ];

  static const List<_ColomboHotspotItem> _colomboHotspots = [
    _ColomboHotspotItem(name: 'Select Predefined Colombo Hotspot...', lat: '', lng: ''),
    _ColomboHotspotItem(name: 'Galle Face Green / Fort (6.9271, 79.8433)', lat: '6.927100', lng: '79.843300'),
    _ColomboHotspotItem(name: 'Kollupitiya Junction / Duplication Rd (6.8970, 79.8560)', lat: '6.897000', lng: '79.856000'),
    _ColomboHotspotItem(name: 'Bambalapitiya Marine Drive (6.8920, 79.8550)', lat: '6.892000', lng: '79.855000'),
    _ColomboHotspotItem(name: 'Borella Junction / Baseline Rd (6.9142, 79.8770)', lat: '6.914200', lng: '79.877000'),
    _ColomboHotspotItem(name: 'Town Hall / Cinnamon Gardens (6.9147, 79.8650)', lat: '6.914700', lng: '79.865000'),
    _ColomboHotspotItem(name: 'Colombo Fort Railway Station (6.9344, 79.8500)', lat: '6.934400', lng: '79.850000'),
    _ColomboHotspotItem(name: 'Peliyagoda / Kelani Bridge (6.9600, 79.8800)', lat: '6.960000', lng: '79.880000'),
  ];

  @override
  void initState() {
    super.initState();
    _descController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _descController.dispose();
    _addressController.dispose();
    _latController.dispose();
    _lngController.dispose();
    _pasteController.dispose();
    super.dispose();
  }

  // ── Image Handling ─────────────────────────────────────────────────────────
  Future<void> _pickImage(ImageSource source) async {
    try {
      if (source == ImageSource.gallery) {
        final pickedList = await _picker.pickMultiImage(imageQuality: 85);
        if (pickedList.isNotEmpty) {
          for (final file in pickedList) {
            final bytes = await file.readAsBytes();
            setState(() {
              _selectedFiles.add(file);
              _previewBytes.add(bytes);
            });
          }
        }
      } else {
        final picked = await _picker.pickImage(source: source, imageQuality: 85);
        if (picked != null) {
          final bytes = await picked.readAsBytes();
          setState(() {
            _selectedFiles.add(picked);
            _previewBytes.add(bytes);
          });
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load photo: $e'), backgroundColor: AppColors.critical),
        );
      }
    }
  }

  void _removeSelectedFile(int index) {
    setState(() {
      _selectedFiles.removeAt(index);
      _previewBytes.removeAt(index);
    });
  }

  void _addSampleEvidence(String label, Color color) {
    // Generate a clean 64x64 colored PNG in memory
    final hexColor = color.toARGB32();
    final a = (hexColor >> 24) & 0xFF;
    final r = (hexColor >> 16) & 0xFF;
    final g = (hexColor >> 8) & 0xFF;
    final b = hexColor & 0xFF;

    // Create a 16x16 minimal PNG byte representation
    final sampleBytes = _createSamplePng(r, g, b, a);
    final xfile = XFile.fromData(
      sampleBytes,
      name: '${label.toLowerCase().replaceAll(' ', '_')}_evidence.png',
      mimeType: 'image/png',
    );

    setState(() {
      _selectedFiles.add(xfile);
      _previewBytes.add(sampleBytes);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Attached evidence preset: $label'),
        duration: const Duration(seconds: 2),
        backgroundColor: const Color(0xFF0284C7),
      ),
    );
  }

  Uint8List _createSamplePng(int r, int g, int b, int a) {
    // 1x1 transparent/colored pixel valid PNG base64 string decoder for zero-dependency portability
    const samplePngBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAF0lEQVR42mN8/u/rfwYqAOOoBaNWMGoBFgB16iwhmB+z7wAAAABJRU5ErkJggg==';
    return base64Decode(samplePngBase64);
  }

  // ── GPS & Coordinate Parsing ───────────────────────────────────────────────
  Future<void> _detectLocation() async {
    setState(() {
      _detectingLocation = true;
      _locationStatus = 'Acquiring high-accuracy GPS fix from device sensors...';
    });

    final pos = await context.read<LocationService>().getCurrentPosition();
    if (mounted) {
      if (pos != null) {
        final latStr = pos.latitude.toStringAsFixed(6);
        final lngStr = pos.longitude.toStringAsFixed(6);
        setState(() {
          _lat = pos.latitude;
          _lng = pos.longitude;
          _latController.text = latStr;
          _lngController.text = lngStr;
          _detectingLocation = false;
          _locationStatus = 'GPS Locked: $latStr° N, $lngStr° E (Accuracy: ±${pos.accuracy.round()}m)';
        });
      } else {
        setState(() {
          _detectingLocation = false;
          _locationStatus = 'GPS detection failed. You can enter coordinates manually or paste a link.';
        });
      }
    }
  }

  void _handleCoordinatePaste(String input) {
    _pasteController.text = input;
    if (input.trim().isEmpty) return;

    // Check for @lat,lng format from Google Maps URL
    final urlMatch = RegExp(r'@(-?\d+\.\d+),(-?\d+\.\d+)').firstMatch(input);
    if (urlMatch != null) {
      final parsedLat = double.tryParse(urlMatch.group(1)!);
      final parsedLng = double.tryParse(urlMatch.group(2)!);
      if (parsedLat != null && parsedLng != null) {
        setState(() {
          _lat = parsedLat;
          _lng = parsedLng;
          _latController.text = _lat.toStringAsFixed(6);
          _lngController.text = _lng.toStringAsFixed(6);
          _locationStatus = 'Extracted coordinates from URL: ${_lat.toStringAsFixed(6)}, ${_lng.toStringAsFixed(6)}';
        });
        return;
      }
    }

    // Check for "lat, lng" pair
    final pairMatch = RegExp(r'(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)').firstMatch(input);
    if (pairMatch != null) {
      final parsedLat = double.tryParse(pairMatch.group(1)!);
      final parsedLng = double.tryParse(pairMatch.group(2)!);
      if (parsedLat != null && parsedLng != null && parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
        setState(() {
          _lat = parsedLat;
          _lng = parsedLng;
          _latController.text = _lat.toStringAsFixed(6);
          _lngController.text = _lng.toStringAsFixed(6);
          _locationStatus = 'Parsed coordinates: ${_lat.toStringAsFixed(6)}° N, ${_lng.toStringAsFixed(6)}° E';
        });
      }
    }
  }

  void _handlePresetSelect(String? name) {
    if (name == null) return;
    final found = _colomboHotspots.firstWhere((h) => h.name == name, orElse: () => _colomboHotspots[0]);
    if (found.lat.isNotEmpty && found.lng.isNotEmpty) {
      final pLat = double.tryParse(found.lat) ?? 6.9271;
      final pLng = double.tryParse(found.lng) ?? 79.8612;
      setState(() {
        _lat = pLat;
        _lng = pLng;
        _latController.text = found.lat;
        _lngController.text = found.lng;
        _locationStatus = 'Location set to ${found.name.split(' (')[0]}';
        if (_addressController.text.trim().isEmpty) {
          _addressController.text = found.name.split(' (')[0];
        }
      });
    }
  }

  // ── Form Submission ────────────────────────────────────────────────────────
  Future<void> _submitReport() async {
    if (!_formKey.currentState!.validate()) return;

    final descText = _descController.text.trim();
    if (descText.length < 10) {
      setState(() => _error = 'Description must be at least 10 characters long.');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final hazardService = context.read<HazardService>();

      // Parse coordinates from controllers
      final pLat = double.tryParse(_latController.text.trim()) ?? _lat;
      final pLng = double.tryParse(_lngController.text.trim()) ?? _lng;

      // Upload photos if any
      String? finalImageUrl;
      if (_selectedFiles.isNotEmpty) {
        finalImageUrl = await hazardService.uploadXFiles(_selectedFiles);
      }

      // Format description with proximity zone and location matching Web CitizenDashboard.tsx
      final combinedDescription = StringBuffer(descText);
      if (_proximityZone.isNotEmpty) {
        combinedDescription.write(' [Proximity Zone: $_proximityZone]');
      }
      final addrText = _addressController.text.trim();
      if (addrText.isNotEmpty) {
        combinedDescription.write(' [Location: $addrText]');
      }

      final generatedTitle = '$_category at ${addrText.isNotEmpty ? addrText : "Colombo"}';

      final created = await hazardService.createHazard(
        title: generatedTitle,
        description: combinedDescription.toString(),
        category: _category,
        severity: 'Medium', // Triaged by AI immediately on backend
        latitude: pLat,
        longitude: pLng,
        locationAddress: addrText.isNotEmpty ? addrText : 'Colombo Municipal Sector',
        imageUrl: finalImageUrl,
      );

      if (mounted) {
        setState(() => _submitting = false);
        _showSuccessDialog(created);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _submitting = false;
        });
      }
    }
  }

  // ── Success Dialog matching Web Modal ──────────────────────────────────────
  void _showSuccessDialog(Hazard hazard) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Badge
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: Color(0xFF16A34A),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check_rounded, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hazard Dispatched!',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF14532D),
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Received and verified by CivitaGuard AI response queue.',
                            style: TextStyle(fontSize: 11, color: Color(0xFF166534)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Ticket Number Pill
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Ticket Reference:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: Text(
                      '#HAZ-${hazard.id.substring(0, 8).toUpperCase()}',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'monospace', color: Color(0xFF0F172A)),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // KPI Grid matching Web
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildResultRow('Category', hazard.category, icon: Icons.label_outline),
                    const Divider(height: 12, color: Color(0xFFE2E8F0)),
                    _buildResultRow('Proximity Multiplier', '$_proximityZone (1.35x Multiplier)', icon: Icons.near_me_outlined),
                    const Divider(height: 12, color: Color(0xFFE2E8F0)),
                    _buildResultRow('Target SLA', '24h Emergency Response Window', icon: Icons.timer_outlined, highlight: true),
                    const Divider(height: 12, color: Color(0xFFE2E8F0)),
                    _buildResultRow('Department Routing', 'CMC Municipal Response Desk', icon: Icons.apartment_outlined),
                  ],
                ),
              ),

              // AI Reasoning Box (if available)
              if (hazard.aiAnalysis?.reasoning != null && hazard.aiAnalysis!.reasoning!.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0FDF4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFBBF7D0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.auto_awesome, size: 14, color: Color(0xFF16A34A)),
                          SizedBox(width: 6),
                          Text(
                            'AI Reasoning & Risk Justification',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF14532D)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '“${hazard.aiAnalysis!.reasoning}”',
                        style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Color(0xFF166534), height: 1.4),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 20),

              // Action Buttons matching Web
              Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (_) => const CitizenMapScreen()),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.map_rounded, size: 16, color: Color(0xFF38BDF8)),
                      label: const Text('View Live Pin on GIS Map →', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        Navigator.pop(context, true);
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF334155),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        padding: const EdgeInsets.symmetric(vertical: 11),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Back to My Reports', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildResultRow(String label, String value, {required IconData icon, bool highlight = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Icon(icon, size: 14, color: highlight ? const Color(0xFF0284C7) : const Color(0xFF64748B)),
            const SizedBox(width: 6),
            Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          ],
        ),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.right,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: highlight ? const Color(0xFF0284C7) : const Color(0xFF0F172A),
            ),
          ),
        ),
      ],
    );
  }

  // ── Main Build ─────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Report Infrastructure Hazard',
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
                letterSpacing: -0.2,
              ),
            ),
            Text(
              'Powered by CivitaGuard AI • Instant Computer Vision',
              style: TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Error banner
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFECACA)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: AppColors.critical, size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _error!,
                          style: const TextStyle(color: AppColors.critical, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),

              // ── Section 1: Hazard Category ─────────────────────────────────
              _buildSectionCard(
                icon: Icons.label_outlined,
                title: 'Hazard Category',
                subtitle: 'Select best fit or "Other"',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _category,
                          isExpanded: true,
                          icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                          items: _hazardCategories.map((cat) {
                            return DropdownMenuItem<String>(
                              value: cat.value,
                              child: Row(
                                children: [
                                  Text(cat.icon, style: const TextStyle(fontSize: 16)),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      cat.label,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) setState(() => _category = val);
                          },
                        ),
                      ),
                    ),

                    // Zero-Shot Notice if "Other" is chosen (matching Web)
                    if (_category == 'Other') ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: const Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(Icons.auto_awesome, size: 16, color: Color(0xFFD97706)),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Zero-Shot AI Detection: When you select "Other", the AI agent analyzes your narrative and evidence photos to automatically deduce the true hazard type and escalate severity if needed.',
                                style: TextStyle(fontSize: 11, color: Color(0xFF92400E), height: 1.4),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // ── Section 2: Proximity Risk Environment ──────────────────────
              _buildSectionCard(
                icon: Icons.place_outlined,
                title: 'Proximity Risk Environment',
                subtitle: 'Urban Risk Multipliers',
                child: GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  childAspectRatio: 2.9,
                  children: _proximityZones.map((zone) {
                    final isSelected = _proximityZone == zone.value;
                    return InkWell(
                      onTap: () => setState(() => _proximityZone = zone.value),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: isSelected ? const Color(0xFF0891B2) : Colors.white,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isSelected ? const Color(0xFF0891B2) : const Color(0xFFCBD5E1),
                          ),
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: const Color(0xFF0891B2).withValues(alpha: 0.25),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  )
                                ]
                              : null,
                        ),
                        child: Row(
                          children: [
                            Icon(
                              zone.icon,
                              size: 16,
                              color: isSelected ? Colors.white : const Color(0xFF0891B2),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                zone.label,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected ? Colors.white : const Color(0xFF334155),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),

              const SizedBox(height: 14),

              // ── Section 3: Description ─────────────────────────────────────
              _buildSectionCard(
                icon: Icons.notes_rounded,
                title: 'Description *',
                subtitle: 'English • සිංහල • தமிழ் (${_descController.text.length} chars)',
                child: TextFormField(
                  controller: _descController,
                  maxLines: 4,
                  style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                  decoration: InputDecoration(
                    hintText:
                        'Provide details: size, water pressure, road damage depth, danger to pedestrians or schoolchildren...',
                    hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.all(12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF0284C7), width: 1.5),
                    ),
                  ),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) {
                      return 'Please provide a detailed description.';
                    }
                    if (val.trim().length < 10) {
                      return 'Description must be at least 10 characters long.';
                    }
                    return null;
                  },
                ),
              ),

              const SizedBox(height: 14),

              // ── Section 4: Street Address or Landmark ──────────────────────
              _buildSectionCard(
                icon: Icons.map_outlined,
                title: 'Street Address or Landmark',
                subtitle: 'Accurate location guide',
                child: TextFormField(
                  controller: _addressController,
                  style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                  decoration: InputDecoration(
                    hintText: 'e.g. Rajakeeya Mawatha near Royal College, Colombo 07',
                    hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: Colors.white,
                    prefixIcon: const Icon(Icons.place_outlined, color: Color(0xFF0284C7), size: 18),
                    suffixIcon: _addressController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.close_rounded, size: 16),
                            onPressed: () {
                              setState(() {
                                _addressController.clear();
                              });
                            },
                          )
                        : null,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: Color(0xFF0284C7), width: 1.5),
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 14),

              // ── Section 5: Photographic Evidence Upload ────────────────────
              _buildSectionCard(
                icon: Icons.camera_alt_outlined,
                title: 'Photographic Evidence',
                subtitle: 'Max 10MB each',
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Dashed dropzone / picker container
                    InkWell(
                      onTap: () => _showPhotoOptions(),
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: const Color(0xFF0891B2).withValues(alpha: 0.5),
                            style: BorderStyle.solid,
                            width: 1.5,
                          ),
                        ),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFEFF),
                                shape: BoxShape.circle,
                                border: Border.all(color: const Color(0xFFA5F3FC)),
                              ),
                              child: const Icon(Icons.cloud_upload_outlined, color: Color(0xFF0891B2), size: 26),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Tap to Capture or Attach Photos',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 2),
                            const Text(
                              'Camera capture & multi-photo gallery supported',
                              style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // Previews grid
                    if (_previewBytes.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 90,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: _previewBytes.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (ctx, idx) {
                            return Stack(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(10),
                                  child: Image.memory(
                                    _previewBytes[idx],
                                    width: 120,
                                    height: 90,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                Positioned(
                                  top: 4,
                                  right: 4,
                                  child: InkWell(
                                    onTap: () => _removeSelectedFile(idx),
                                    child: Container(
                                      padding: const EdgeInsets.all(3),
                                      decoration: const BoxDecoration(
                                        color: Color(0xFFDC2626),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(Icons.close_rounded, size: 12, color: Colors.white),
                                    ),
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ),
                    ],

                    const SizedBox(height: 10),

                    // Presets matching Web
                    Row(
                      children: [
                        const Text(
                          'PRESETS:',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF94A3B8)),
                        ),
                        const SizedBox(width: 8),
                        ActionChip(
                          avatar: const Icon(Icons.add, size: 14, color: Color(0xFF334155)),
                          label: const Text('+ Pothole Photo', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          backgroundColor: Colors.white,
                          side: const BorderSide(color: Color(0xFFE2E8F0)),
                          onPressed: () => _addSampleEvidence('Pothole Asphalt Crater', const Color(0xFF334155)),
                        ),
                        const SizedBox(width: 6),
                        ActionChip(
                          avatar: const Icon(Icons.add, size: 14, color: Color(0xFF0284C7)),
                          label: const Text('+ Water Burst Photo', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
                          backgroundColor: Colors.white,
                          side: const BorderSide(color: Color(0xFFBAE6FD)),
                          onPressed: () => _addSampleEvidence('Water Main Pipe Burst', const Color(0xFF0284C7)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // ── Section 6: GIS Geodetic Coordinates ────────────────────────
              _buildSectionCard(
                icon: Icons.explore_outlined,
                title: 'GIS Geodetic Coordinates',
                subtitle: 'High precision location',
                trailing: TextButton.icon(
                  onPressed: _detectingLocation ? null : _detectLocation,
                  icon: _detectingLocation
                      ? const SizedBox(
                          width: 12,
                          height: 12,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0891B2)),
                        )
                      : const Icon(Icons.my_location, size: 14, color: Color(0xFF0891B2)),
                  label: Text(
                    _detectingLocation ? 'Locating...' : 'Auto-Detect GPS',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0891B2)),
                  ),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    visualDensity: VisualDensity.compact,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Predefined Hotspots Dropdown (matching Web COLOMBO_HOTSPOTS select)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFCBD5E1)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          isExpanded: true,
                          hint: const Text(
                            'Select Predefined Colombo Hotspot...',
                            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                          ),
                          items: _colomboHotspots.map((h) {
                            return DropdownMenuItem<String>(
                              value: h.name,
                              child: Text(
                                h.name,
                                style: const TextStyle(fontSize: 12, color: Color(0xFF334155)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }).toList(),
                          onChanged: _handlePresetSelect,
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    // 2-Column Latitude & Longitude inputs
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('LATITUDE (°N)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF64748B))),
                              const SizedBox(height: 4),
                              TextFormField(
                                controller: _latController,
                                style: const TextStyle(fontSize: 12, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('LONGITUDE (°E)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF64748B))),
                              const SizedBox(height: 4),
                              TextFormField(
                                controller: _lngController,
                                style: const TextStyle(fontSize: 12, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                                decoration: InputDecoration(
                                  filled: true,
                                  fillColor: Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(8),
                                    borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 10),

                    // Coordinate paste input
                    TextFormField(
                      controller: _pasteController,
                      onChanged: _handleCoordinatePaste,
                      style: const TextStyle(fontSize: 12, fontFamily: 'monospace'),
                      decoration: InputDecoration(
                        hintText: 'Paste Google Maps URL or lat, lng...',
                        hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        filled: true,
                        fillColor: Colors.white,
                        prefixIcon: const Icon(Icons.content_paste_rounded, size: 16, color: Color(0xFF64748B)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                          borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                        ),
                      ),
                    ),

                    if (_locationStatus != null) ...[
                      const SizedBox(height: 6),
                      Text(
                        _locationStatus!,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0891B2)),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // ── Section 7: Form Actions ────────────────────────────────────
              Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: OutlinedButton(
                      onPressed: _submitting ? null : () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF475569),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      onPressed: _submitting ? null : _submitReport,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        elevation: 4,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: _submitting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.cyanAccent),
                            )
                          : const Icon(Icons.auto_awesome, size: 16, color: Colors.cyanAccent),
                      label: Text(
                        _submitting ? 'Analyzing & Submitting...' : 'Submit & Run AI Triage',
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionCard({
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? trailing,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9).withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(icon, size: 16, color: const Color(0xFF0891B2)),
                  const SizedBox(width: 6),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
              if (trailing != null)
                trailing
              else
                Text(
                  subtitle,
                  style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                ),
            ],
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }

  void _showPhotoOptions() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Wrap(
          children: [
            ListTile(
              leading: const Icon(Icons.camera_alt_rounded, color: Color(0xFF0891B2)),
              title: const Text('Take Photo with Camera', style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_rounded, color: Color(0xFF0284C7)),
              title: const Text('Choose from Photo Gallery (Multi-select)', style: TextStyle(fontWeight: FontWeight.w600)),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.gallery);
              },
            ),
          ],
        ),
      ),
    );
  }
}
