import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../models/hazard.dart';
import '../../services/hazard_service.dart';
import '../../services/location_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ai_triage_card.dart';

class ReportHazardScreen extends StatefulWidget {
  const ReportHazardScreen({super.key});

  @override
  State<ReportHazardScreen> createState() => _ReportHazardScreenState();
}

class _ReportHazardScreenState extends State<ReportHazardScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  final _addressController = TextEditingController();

  String _selectedCategory = 'Pothole';
  String _selectedSeverity = 'Medium';
  double _lat = 6.9271;
  double _lng = 79.8612;

  File? _selectedImage;
  bool _gettingLocation = false;
  bool _submitting = false;
  String? _errorMessage;
  HazardAIAnalysis? _aiAnalysisResult;

  final ImagePicker _picker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(source: source, imageQuality: 85);
      if (picked != null) {
        setState(() {
          _selectedImage = File(picked.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pick photo: $e')),
        );
      }
    }
  }

  Future<void> _detectGPS() async {
    setState(() => _gettingLocation = true);
    final pos = await context.read<LocationService>().getCurrentPosition();
    if (mounted) {
      if (pos != null) {
        setState(() {
          _lat = pos.latitude;
          _lng = pos.longitude;
          if (_addressController.text.trim().isEmpty || _addressController.text.startsWith('GPS Captured:')) {
            _addressController.text =
                'Colombo (${_lat.toStringAsFixed(5)}, ${_lng.toStringAsFixed(5)})';
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('GPS Locked: ${_lat.toStringAsFixed(4)}° N, ${_lng.toStringAsFixed(4)}° E'),
            backgroundColor: AppColors.success,
            duration: const Duration(seconds: 2),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not obtain live GPS coordinates. Please enter landmark manually.'),
            backgroundColor: AppColors.critical,
          ),
        );
      }
      setState(() => _gettingLocation = false);
    }
  }

  Future<void> _submitReport() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      final service = context.read<HazardService>();
      String? uploadedUrl;

      if (_selectedImage != null) {
        uploadedUrl = await service.uploadImage(_selectedImage!);
      }

      final created = await service.createHazard(
        title: _titleController.text.trim(),
        description: _descController.text.trim(),
        category: _selectedCategory,
        severity: _selectedSeverity,
        latitude: _lat,
        longitude: _lng,
        locationAddress: _addressController.text.trim(),
        imageUrl: uploadedUrl,
      );

      if (mounted) {
        setState(() {
          _submitting = false;
          _aiAnalysisResult = created.aiAnalysis;
        });

        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: AppColors.success),
                SizedBox(width: 8),
                Text('Hazard Dispatched!'),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Your municipal hazard report has been recorded and triaged by AI.',
                  style: TextStyle(fontSize: 13),
                ),
                if (_aiAnalysisResult != null) ...[
                  const SizedBox(height: 12),
                  AITriageCard(aiAnalysis: _aiAnalysisResult!),
                ],
              ],
            ),
            actions: [
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.pop(context, true);
                },
                child: const Text('Back to Feed'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _submitting = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('Report Municipal Hazard'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Text(_errorMessage!, style: const TextStyle(color: AppColors.critical, fontSize: 13)),
                ),
              const Text(
                'Photo Evidence (Visual AI Inspection)',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textDark),
              ),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () => _showPhotoOptions(),
                child: Container(
                  height: 160,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.cityBorder),
                  ),
                  child: _selectedImage != null
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.file(_selectedImage!, fit: BoxFit.cover),
                        )
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.08),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.camera_alt, color: AppColors.primary, size: 28),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Tap to Capture or Upload Photo',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                            ),
                            const Text(
                              'AI will analyze road cracks, flood depth & severity',
                              style: TextStyle(fontSize: 11, color: AppColors.textGrey),
                            ),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Hazard Classification',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textDark),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: kHazardCategories.map((cat) {
                  final isSelected = _selectedCategory == cat.id;
                  return ChoiceChip(
                    label: Text(cat.name),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    labelStyle: TextStyle(
                      color: isSelected ? Colors.white : AppColors.textDark,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedCategory = cat.id);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(
                  labelText: 'Incident Title *',
                  hintText: 'e.g. Deep pothole near Galle Face Roundabout',
                ),
                validator: (val) =>
                    (val == null || val.trim().isEmpty) ? 'Please enter a title' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _descController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Detailed Description *',
                  hintText: 'Describe dimensions, hazard danger, traffic blockage...',
                ),
                validator: (val) =>
                    (val == null || val.trim().isEmpty) ? 'Please enter a description' : null,
              ),
              const SizedBox(height: 16),
              const Text(
                'Severity Level',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textDark),
              ),
              const SizedBox(height: 8),
              Row(
                children: ['Low', 'Medium', 'High', 'Critical'].map((sev) {
                  final isSelected = _selectedSeverity == sev;
                  Color col = AppColors.primary;
                  if (sev == 'Critical') col = AppColors.critical;
                  if (sev == 'High') col = AppColors.warning;
                  if (sev == 'Low') col = AppColors.success;

                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: OutlinedButton(
                        onPressed: () => setState(() => _selectedSeverity = sev),
                        style: OutlinedButton.styleFrom(
                          backgroundColor: isSelected ? col : Colors.white,
                          side: BorderSide(color: col),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text(
                          sev,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : col,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.cityBorder),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.location_on, color: AppColors.primary, size: 18),
                            SizedBox(width: 6),
                            Text(
                              'Incident Geolocation',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textDark),
                            ),
                          ],
                        ),
                        InkWell(
                          onTap: _gettingLocation ? null : _detectGPS,
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (_gettingLocation)
                                  const SizedBox(
                                    width: 12,
                                    height: 12,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                                  )
                                else
                                  const Icon(Icons.my_location, size: 14, color: AppColors.primary),
                                const SizedBox(width: 5),
                                Text(
                                  _gettingLocation ? 'Locating...' : 'Use Live GPS',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: _addressController,
                      decoration: InputDecoration(
                        hintText: 'Enter street name, landmark, or intersection *',
                        labelText: 'Location / Landmark Address *',
                        filled: true,
                        fillColor: Colors.white,
                        prefixIcon: const Icon(Icons.place_outlined, color: AppColors.primary),
                        suffixIcon: _addressController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 16),
                                onPressed: () {
                                  setState(() {
                                    _addressController.clear();
                                  });
                                },
                              )
                            : null,
                      ),
                      validator: (val) =>
                          (val == null || val.trim().isEmpty) ? 'Please enter address or landmark' : null,
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.cityBorder),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.gps_fixed, size: 14, color: _lat != 0.0 ? AppColors.success : AppColors.textGrey),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'GPS Coords: ${_lat.toStringAsFixed(4)}° N, ${_lng.toStringAsFixed(4)}° E',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.textDark),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.success.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text(
                              'Colombo Sector',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.success),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _submitting ? null : _submitReport,
                child: _submitting
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.send_rounded, size: 18),
                          SizedBox(width: 8),
                          Text('Dispatch Report to Municipal AI Triage', style: TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
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
              leading: const Icon(Icons.camera_alt, color: AppColors.primary),
              title: const Text('Take Photo with Camera'),
              onTap: () {
                Navigator.pop(ctx);
                _pickImage(ImageSource.camera);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_library, color: AppColors.teal),
              title: const Text('Choose from Photo Gallery'),
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
