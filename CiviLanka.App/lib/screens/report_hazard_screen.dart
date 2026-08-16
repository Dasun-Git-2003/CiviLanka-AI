import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../models/hazard.dart';
import '../services/hazard_service.dart';
import '../services/location_service.dart';

class ReportHazardScreen extends StatefulWidget {
  const ReportHazardScreen({super.key});

  @override
  State<ReportHazardScreen> createState() => _ReportHazardScreenState();
}

class _ReportHazardScreenState extends State<ReportHazardScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descCtrl = TextEditingController();
  String _selectedCategory = HazardCategory.pothole;
  File? _selectedImage;
  double? _latitude;
  double? _longitude;
  bool _locationLoading = false;
  bool _submitting = false;
  String? _locationText;
  String? _error;

  @override
  void dispose() {
    _descCtrl.dispose();
    super.dispose();
  }

  // ── GPS ─────────────────────────────────────────────────────────────────────

  Future<void> _captureLocation() async {
    setState(() { _locationLoading = true; _error = null; });
    final locationService = context.read<LocationService>();
    final result = await locationService.getCurrentLocation();

    if (!mounted) return;
    if (result == null) {
      setState(() {
        _locationText = null;
        _locationLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
              'Location not available. Enable GPS and grant permission in Settings.'),
          backgroundColor: Colors.orange,
        ),
      );
    } else {
      setState(() {
        _latitude = result.latitude;
        _longitude = result.longitude;
        _locationText =
            'Lat: ${result.latitude.toStringAsFixed(5)}, Lon: ${result.longitude.toStringAsFixed(5)}';
        _locationLoading = false;
      });
    }
  }

  // ── Image Picker ─────────────────────────────────────────────────────────────

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: 1280,
        maxHeight: 1280,
        imageQuality: 85,
      );
      if (picked != null) {
        setState(() => _selectedImage = File(picked.path));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not access camera or gallery.')),
        );
      }
    }
  }

  void _showImageSourceDialog() {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Take Photo'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Choose from Gallery'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(ImageSource.gallery);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _submitting = true; _error = null; });

    try {
      final hazardService = context.read<HazardService>();
      await hazardService.createHazard(
        category: _selectedCategory,
        description: _descCtrl.text.trim(),
        latitude: _latitude,
        longitude: _longitude,
        imageFile: _selectedImage,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Hazard submitted! AI is analyzing your report.'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Report Hazard')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_error!,
                        style:
                            TextStyle(color: theme.colorScheme.error)),
                  ),
                  const SizedBox(height: 16),
                ],

                // Category
                _SectionLabel('Hazard Category'),
                DropdownButtonFormField<String>(
                  value: _selectedCategory,
                  decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.category_outlined),
                  ),
                  items: HazardCategory.all
                      .map((cat) => DropdownMenuItem(
                            value: cat,
                            child:
                                Text(HazardCategory.displayName(cat)),
                          ))
                      .toList(),
                  onChanged: (v) =>
                      setState(() => _selectedCategory = v!),
                ),
                const SizedBox(height: 20),

                // Description
                _SectionLabel('Description'),
                TextFormField(
                  controller: _descCtrl,
                  maxLines: 4,
                  maxLength: 2000,
                  decoration: const InputDecoration(
                    hintText:
                        'Describe the hazard in detail — location, size, danger level...',
                    alignLabelWithHint: true,
                    prefixIcon: Padding(
                      padding: EdgeInsets.only(bottom: 60),
                      child: Icon(Icons.description_outlined),
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.trim().isEmpty)
                      return 'Description is required';
                    if (v.trim().length < 10)
                      return 'Please provide more detail (at least 10 characters)';
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Photo
                _SectionLabel('Photo (optional but recommended)'),
                if (_selectedImage != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: Image.file(
                      _selectedImage!,
                      height: 200,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                OutlinedButton.icon(
                  onPressed: _showImageSourceDialog,
                  icon: Icon(_selectedImage == null
                      ? Icons.add_a_photo_outlined
                      : Icons.change_circle_outlined),
                  label: Text(_selectedImage == null
                      ? 'Add Photo'
                      : 'Change Photo'),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 20),

                // Location
                _SectionLabel('GPS Location'),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: _latitude != null
                        ? Colors.green.withOpacity(0.05)
                        : Colors.grey.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _latitude != null
                          ? Colors.green.withOpacity(0.4)
                          : Colors.grey.withOpacity(0.3),
                    ),
                  ),
                  child: Row(\n                    children: [\n                      Icon(\n                        _latitude != null\n                            ? Icons.location_on\n                            : Icons.location_off,\n                        color: _latitude != null\n                            ? Colors.green\n                            : Colors.grey,\n                      ),\n                      const SizedBox(width: 10),\n                      Expanded(\n                        child: Text(\n                          _locationText ??\n                              'No location captured yet',\n                          style: TextStyle(\n                            color: _latitude != null\n                                ? Colors.green[700]\n                                : Colors.grey[600],\n                          ),\n                        ),\n                      ),\n                    ],\n                  ),\n                ),\n                const SizedBox(height: 10),\n                OutlinedButton.icon(\n                  onPressed:\n                      _locationLoading ? null : _captureLocation,\n                  icon: _locationLoading\n                      ? const SizedBox(\n                          width: 16,\n                          height: 16,\n                          child: CircularProgressIndicator(\n                              strokeWidth: 2))\n                      : const Icon(Icons.my_location),\n                  label: Text(_locationLoading\n                      ? 'Getting location...'\n                      : _latitude != null\n                          ? 'Update Location'\n                          : 'Capture GPS Location'),\n                  style: OutlinedButton.styleFrom(\n                    padding:\n                        const EdgeInsets.symmetric(vertical: 14),\n                    shape: RoundedRectangleBorder(\n                        borderRadius: BorderRadius.circular(10)),\n                  ),\n                ),\n                const SizedBox(height: 32),\n\n                // Submit\n                ElevatedButton(\n                  onPressed: _submitting ? null : _submit,\n                  style: ElevatedButton.styleFrom(\n                    padding: const EdgeInsets.symmetric(vertical: 16),\n                  ),\n                  child: _submitting\n                      ? const Row(\n                          mainAxisAlignment: MainAxisAlignment.center,\n                          children: [\n                            SizedBox(\n                              width: 20,\n                              height: 20,\n                              child: CircularProgressIndicator(\n                                  strokeWidth: 2,\n                                  color: Colors.white),\n                            ),\n                            SizedBox(width: 12),\n                            Text('Submitting...'),\n                          ],\n                        )\n                      : const Text('Submit Hazard Report'),\n                ),\n                const SizedBox(height: 32),\n              ],\n            ),\n          ),\n        ),\n      ),\n    );\n  }\n}\n\nclass _SectionLabel extends StatelessWidget {\n  final String text;\n  const _SectionLabel(this.text);\n\n  @override\n  Widget build(BuildContext context) => Padding(\n        padding: const EdgeInsets.only(bottom: 8),\n        child: Text(\n          text,\n          style: const TextStyle(\n              fontWeight: FontWeight.w600, fontSize: 14),\n        ),\n      );\n}\n
