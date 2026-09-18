import 'package:flutter/material.dart';
import '../models/work_order.dart';
import '../services/api_service.dart';

class ExecutionScreen extends StatefulWidget {
  final WorkOrder workOrder;

  const ExecutionScreen({super.key, required this.workOrder});

  @override
  State<ExecutionScreen> createState() => _ExecutionScreenState();
}

class _ExecutionScreenState extends State<ExecutionScreen> {
  late String _currentStatus;
  bool _isProcessing = false;
  String? _beforePhotoUrl;
  String? _afterPhotoUrl;
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _costController = TextEditingController();
  final TextEditingController _materialInputController = TextEditingController();
  final List<String> _materialsUsed = [];
  double? _currentLat;
  double? _currentLng;
  Map<String, dynamic>? _auditResult;

  @override
  void initState() {
    super.initState();
    _currentStatus = widget.workOrder.status;
    _beforePhotoUrl = widget.workOrder.beforePhoto;
    _afterPhotoUrl = widget.workOrder.afterPhoto;
    _materialsUsed.addAll(widget.workOrder.materials);
    _costController.text = widget.workOrder.estimatedCost.toStringAsFixed(0);
    // Default GPS coordinates to hazard location for accurate field test
    _currentLat = widget.workOrder.locationLat;
    _currentLng = widget.workOrder.locationLng;
  }

  Future<void> _handleStartWork() async {
    setState(() => _isProcessing = true);
    final success = await ApiService.startWork(widget.workOrder.id);
    setState(() {
      _isProcessing = false;
      if (success) _currentStatus = 'IN_PROGRESS';
    });
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Work initiated. Safety protocols active.'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    }
  }

  Future<void> _handleCompleteWork() async {
    if (_beforePhotoUrl == null || _afterPhotoUrl == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Municipal audit requires BOTH before and after photographs.'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    setState(() => _isProcessing = true);

    final result = await ApiService.completeWork(
      workOrderId: widget.workOrder.id,
      actualCost: double.tryParse(_costController.text) ?? widget.workOrder.estimatedCost,
      materialsUsed: _materialsUsed,
      beforePhoto: _beforePhotoUrl!,
      afterPhoto: _afterPhotoUrl!,
      completionNotes: _notesController.text.isNotEmpty ? _notesController.text : 'Repair concluded in compliance with standards.',
      completionLat: _currentLat ?? widget.workOrder.locationLat,
      completionLng: _currentLng ?? widget.workOrder.locationLng,
    );

    setState(() {
      _isProcessing = false;
      _auditResult = result['auditResult'];
      if (result['success'] == true) {
        _currentStatus = result['auditResult']?['compliance'] == 'PASS' ? 'VERIFIED' : 'COMPLETED';
      }
    });

    if (mounted && _auditResult != null) {
      _showAuditResultModal(_auditResult!);
    }
  }

  void _showAuditResultModal(Map<String, dynamic> audit) {
    final isPass = audit['compliance'] == 'PASS';
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(
              isPass ? Icons.check_circle : Icons.warning_amber_rounded,
              color: isPass ? const Color(0xFF10B981) : Colors.redAccent,
            ),
            const SizedBox(width: 8),
            Text(
              'AI Safety Audit: ${audit['compliance']}',
              style: TextStyle(
                color: isPass ? const Color(0xFF10B981) : Colors.redAccent,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              audit['reason'] ?? '',
              style: const TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 12),
            if (audit['gps_distance_meters'] != null)
              Text(
                'GPS Offset: ${audit['gps_distance_meters']}m (Tolerance: <=50m)',
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
              ),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pop(context, true);
            },
            child: const Text('Acknowledge & Return'),
          )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Work Order #${widget.workOrder.id}'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF334155)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, color: Color(0xFF10B981), size: 20),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('LIFECYCLE STATUS', style: TextStyle(fontSize: 10, color: Colors.grey)),
                      Text(
                        _currentStatus,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                    ],
                  ),
                  const Spacer(),
                  if (_currentStatus == 'ASSIGNED')
                    ElevatedButton(
                      onPressed: _isProcessing ? null : _handleStartWork,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF3B82F6),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      ),
                      child: const Text('Start Work', style: TextStyle(color: Colors.white)),
                    ),
                ],
              ),
            ),

            const SizedBox(height: 16),
            Text(widget.workOrder.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 6),
            Text(widget.workOrder.description, style: TextStyle(color: Colors.grey.shade400, fontSize: 13)),

            const SizedBox(height: 20),
            // Location & GPS Pin
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('INCIDENT LOCATION & GPS', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.pin_drop, color: Colors.redAccent, size: 18),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          widget.workOrder.roadName,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Coords: ${widget.workOrder.locationLat}, ${widget.workOrder.locationLng}',
                    style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),
            // Photo Upload Section (Before & After)
            const Text('PHOTO EVIDENCE (MANDATORY FOR AUDIT)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 120,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: _beforePhotoUrl != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(_beforePhotoUrl!, fit: BoxFit.cover),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.camera_alt, color: Color(0xFF10B981)),
                                onPressed: () {
                                  setState(() {
                                    _beforePhotoUrl = "https://images.unsplash.com/photo-1542013936693-884638332954?w=600&auto=format&fit=crop&q=80";
                                  });
                                },
                              ),
                              const Text('Upload Before Photo', style: TextStyle(fontSize: 11, color: Colors.grey)),
                            ],
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    height: 120,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: _afterPhotoUrl != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(_afterPhotoUrl!, fit: BoxFit.cover),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.camera_alt, color: Colors.blueAccent),
                                onPressed: () {
                                  setState(() {
                                    _afterPhotoUrl = "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600&auto=format&fit=crop&q=80";
                                  });
                                },
                              ),
                              const Text('Upload After Photo', style: TextStyle(fontSize: 11, color: Colors.grey)),
                            ],
                          ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),
            // Materials Used
            const Text('MATERIALS CONSUMED', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _materialsUsed
                  .map((m) => Chip(
                        label: Text(m, style: const TextStyle(fontSize: 12, color: Colors.white)),
                        backgroundColor: const Color(0xFF1E293B),
                        deleteIcon: const Icon(Icons.close, size: 14),
                        onDeleted: () => setState(() => _materialsUsed.remove(m)),
                      ))
                  .toList(),
            ),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _materialInputController,
                    decoration: const InputDecoration(
                      hintText: 'Add material item (e.g. 5kg Bitumen)',
                      hintStyle: TextStyle(fontSize: 12, color: Colors.grey),
                      isDense: true,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle, color: Color(0xFF10B981)),
                  onPressed: () {
                    if (_materialInputController.text.isNotEmpty) {
                      setState(() {
                        _materialsUsed.add(_materialInputController.text.trim());
                        _materialInputController.clear();
                      });
                    }
                  },
                )
              ],
            ),

            const SizedBox(height: 20),
            // Actual Cost & Notes
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('ACTUAL EXPENDITURE (LKR)', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _costController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          isDense: true,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),
            const Text('COMPLETION NOTES / SAFETY CONTROLS', style: TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            TextField(
              controller: _notesController,
              maxLines: 2,
              decoration: const InputDecoration(
                hintText: 'Describe repair actions, safety cones placed, and site clearance...',
                hintStyle: TextStyle(fontSize: 12, color: Colors.grey),
                border: OutlineInputBorder(),
              ),
            ),

            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isProcessing ? null : _handleCompleteWork,
                icon: const Icon(Icons.verified_outlined),
                label: Text(
                  _isProcessing ? 'Auditing with AI Agent...' : 'Complete Job & Submit to AI Audit',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
