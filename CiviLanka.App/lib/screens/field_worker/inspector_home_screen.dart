import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../models/maintenance_record.dart';
import '../../services/maintenance_service.dart';
import '../../theme/app_colors.dart';

class InspectorHomeScreen extends StatefulWidget {
  const InspectorHomeScreen({super.key});

  @override
  State<InspectorHomeScreen> createState() => _InspectorHomeScreenState();
}

class _InspectorHomeScreenState extends State<InspectorHomeScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<MaintenanceRecord> _records = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadAssignments();
  }

  Future<void> _loadAssignments() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final service = context.read<MaintenanceService>();
      final list = await service.getMyAssignments();
      if (mounted) {
        setState(() {
          _records = list;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Field Operations Hub', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            Text('Member 4: Maintenance Operations & Safety Audit', style: TextStyle(fontSize: 11, color: AppColors.slate500)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.teal),
            onPressed: _loading ? null : _loadAssignments,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.teal,
          indicatorColor: AppColors.teal,
          unselectedLabelColor: AppColors.slate500,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          tabs: const [
            Tab(text: 'ACTION NEEDED'),
            Tab(text: 'IN PROGRESS'),
            Tab(text: 'AUDITED'),
            Tab(text: 'ALL JOBS'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.teal))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppColors.critical),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate600)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _loadAssignments,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.teal),
                        ),
                      ],
                    ),
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildList(_records.where((r) => r.isAssignedOrScheduled).toList()),
                    _buildList(_records.where((r) => r.isInProgress).toList()),
                    _buildList(_records.where((r) => r.isCompleted).toList()),
                    _buildList(_records),
                  ],
                ),
    );
  }

  Widget _buildList(List<MaintenanceRecord> items) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_turned_in_outlined, size: 52, color: AppColors.slate300),
            const SizedBox(height: 12),
            const Text(
              'No Maintenance Tasks Found',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.slate600),
            ),
            const SizedBox(height: 4),
            const Text(
              'You have no assigned tasks in this state.',
              style: TextStyle(fontSize: 12, color: AppColors.slate400),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadAssignments,
      color: AppColors.teal,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (ctx, i) => _buildCard(items[i]),
      ),
    );
  }

  Widget _buildCard(MaintenanceRecord rec) {
    Color badgeColor = AppColors.primary;
    if (rec.isInProgress) badgeColor = AppColors.warning;
    if (rec.isVerified) badgeColor = AppColors.teal;
    if (rec.isCompleted) badgeColor = AppColors.success;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.cityBorder),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    rec.status.toUpperCase(),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: badgeColor,
                    ),
                  ),
                ),
                Text(
                  rec.maintenanceType,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.slate500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              rec.workOrderTitle ?? rec.description,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textDark),
            ),
            const SizedBox(height: 6),
            Text(
              rec.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: AppColors.slate600),
            ),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.timer_outlined, size: 14, color: AppColors.slate400),
                    const SizedBox(width: 4),
                    Text('${rec.labourHours} hrs', style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
                    const SizedBox(width: 12),
                    const Icon(Icons.payments_outlined, size: 14, color: AppColors.slate400),
                    const SizedBox(width: 4),
                    Text('Rs. ${rec.actualCost.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
                  ],
                ),
                Text(
                  DateFormat('MMM dd').format(rec.createdAt),
                  style: const TextStyle(fontSize: 11, color: AppColors.slate400),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                if (rec.isAssignedOrScheduled)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _updateStatus(rec.id, 'InProgress'),
                      icon: const Icon(Icons.play_arrow, size: 16, color: Colors.white),
                      label: const Text('Start Work', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.teal,
                        minimumSize: const Size(0, 38),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                if (rec.isInProgress) ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _showEvidenceModal(rec),
                      icon: const Icon(Icons.camera_alt_outlined, size: 16, color: AppColors.teal),
                      label: const Text('Evidence', style: TextStyle(fontSize: 12, color: AppColors.teal, fontWeight: FontWeight.bold)),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 38),
                        side: const BorderSide(color: AppColors.teal),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _updateStatus(rec.id, 'WorkCompleted'),
                      icon: const Icon(Icons.check_circle_outline, size: 16, color: Colors.white),
                      label: const Text('Sign Off', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        minimumSize: const Size(0, 38),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ],
                if (rec.isCompleted)
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.teal.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.verified, color: AppColors.teal, size: 16),
                          SizedBox(width: 6),
                          Text(
                            'Audited & Verified by AI Safety Model',
                            style: TextStyle(fontSize: 12, color: AppColors.teal, fontWeight: FontWeight.bold),
                          ),
                        ],
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

  Future<void> _updateStatus(String id, String status) async {
    try {
      await context.read<MaintenanceService>().updateStatus(id, status: status);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status changed to $status'), backgroundColor: AppColors.teal),
        );
        _loadAssignments();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.critical),
        );
      }
    }
  }

  void _showEvidenceModal(MaintenanceRecord rec) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Upload Maintenance Evidence',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              const Text(
                'Attach visual verification before and after repair execution for Municipal Safety & Audit validation.',
                style: TextStyle(fontSize: 12, color: AppColors.slate500),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        _pickAndUploadEvidence(rec.id, 'before');
                      },
                      icon: const Icon(Icons.camera_alt, color: Colors.white, size: 16),
                      label: const Text('Before Photo', style: TextStyle(color: Colors.white)),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        _pickAndUploadEvidence(rec.id, 'after');
                      },
                      icon: const Icon(Icons.check, color: Colors.white, size: 16),
                      label: const Text('After Photo', style: TextStyle(color: Colors.white)),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
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

  Future<void> _pickAndUploadEvidence(String id, String type) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (picked != null) {
      try {
        await context.read<MaintenanceService>().uploadEvidence(
              id,
              file: File(picked.path),
              evidenceType: type,
            );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$type photo evidence submitted for AI audit!'),
              backgroundColor: AppColors.teal,
            ),
          );
          _loadAssignments();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Upload failed: $e'), backgroundColor: AppColors.critical),
          );
        }
      }
    }
  }
}
