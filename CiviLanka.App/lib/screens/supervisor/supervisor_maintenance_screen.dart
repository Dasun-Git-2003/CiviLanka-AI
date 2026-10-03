import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/widgets/civic_badge.dart';
import '../../core/widgets/civic_button.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_dialogs.dart';
import '../../core/widgets/civic_states.dart';
import '../../core/widgets/civic_text_field.dart';
import '../../models/maintenance_record.dart';
import '../../services/maintenance_service.dart';
import '../../theme/app_colors.dart';

class SupervisorMaintenanceScreen extends StatefulWidget {
  const SupervisorMaintenanceScreen({super.key});

  @override
  State<SupervisorMaintenanceScreen> createState() =>
      _SupervisorMaintenanceScreenState();
}

class _SupervisorMaintenanceScreenState
    extends State<SupervisorMaintenanceScreen> {
  int _selectedTabIndex = 0; // 0: Pending Verification, 1: All, 2: Safety Issues
  bool _loading = true;
  String? _error;

  List<MaintenanceRecord> _records = [];

  @override
  void initState() {
    super.initState();
    _loadRecords();
  }

  Future<void> _loadRecords() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final list = await context.read<MaintenanceService>().getAll();
      setState(() {
        _records = list;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<MaintenanceRecord> get _filteredRecords {
    switch (_selectedTabIndex) {
      case 0:
        return _records
            .where((r) =>
                r.status.toUpperCase() == 'WORKCOMPLETED' ||
                r.status.toUpperCase() == 'COMPLETED' ||
                r.status.toUpperCase() == 'PENDINGVERIFICATION')
            .toList();
      case 1:
        return _records;
      case 2:
        return _records
            .where((r) =>
                r.aiSafetyAnalysis != null &&
                r.aiSafetyAnalysis!.complianceStatus.toLowerCase() !=
                    'compliant')
            .toList();
      default:
        return _records;
    }
  }

  void _showVerificationSheet(MaintenanceRecord record) {
    CivicBottomSheet.show(
      context: context,
      title: 'Verification: ${record.workOrderNumber ?? record.workOrderTitle ?? "Task"}',
      child: _VerificationDetailView(
        record: record,
        onActionComplete: () {
          Navigator.pop(context);
          _loadRecords();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tabs = ['Pending Verification', 'All Maintenance', 'Safety Alerts'];

    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text(
          'Field Verification',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadRecords,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: List.generate(tabs.length, (idx) {
                final isSelected = _selectedTabIndex == idx;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedTabIndex = idx),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: isSelected
                                ? AppColors.teal
                                : Colors.transparent,
                            width: 2,
                          ),
                        ),
                      ),
                      child: Text(
                        tabs[idx],
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight:
                              isSelected ? FontWeight.bold : FontWeight.w500,
                          color: isSelected
                              ? AppColors.tealDark
                              : AppColors.slate500,
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          const Divider(height: 1),

          // List
          Expanded(
            child: _loading
                ? const CivicSkeletonList(itemCount: 4, height: 110)
                : _error != null
                    ? Center(
                        child: CivicErrorCard(
                          message: _error!,
                          onRetry: _loadRecords,
                        ),
                      )
                    : _filteredRecords.isEmpty
                        ? const CivicEmptyState(
                            title: 'No Records Found',
                            message: 'No maintenance operations in this queue.',
                            icon: Icons.check_circle_outline,
                          )
                        : RefreshIndicator(
                            onRefresh: _loadRecords,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _filteredRecords.length,
                              itemBuilder: (ctx, i) {
                                final r = _filteredRecords[i];
                                return _MaintenanceRecordCard(
                                  record: r,
                                  onTap: () => _showVerificationSheet(r),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

class _MaintenanceRecordCard extends StatelessWidget {
  final MaintenanceRecord record;
  final VoidCallback onTap;

  const _MaintenanceRecordCard({
    required this.record,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: CivicCard(
        padding: const EdgeInsets.all(14),
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  record.workOrderNumber ?? 'WO-RECORD',
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: AppColors.tealDark,
                  ),
                ),
                CivicStatusBadge(status: record.status),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              record.workOrderTitle ?? record.description,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppColors.slate900,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Labour: ${record.labourHours} hrs',
                  style: const TextStyle(fontSize: 12, color: AppColors.slate600),
                ),
                if (record.aiSafetyAnalysis != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: record.aiSafetyAnalysis!.complianceStatus
                                  .toLowerCase() ==
                              'compliant'
                          ? AppColors.success.withValues(alpha: 0.1)
                          : AppColors.critical.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      record.aiSafetyAnalysis!.complianceStatus.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: record.aiSafetyAnalysis!.complianceStatus
                                    .toLowerCase() ==
                                'compliant'
                            ? AppColors.success
                            : AppColors.critical,
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

class _VerificationDetailView extends StatefulWidget {
  final MaintenanceRecord record;
  final VoidCallback onActionComplete;

  const _VerificationDetailView({
    required this.record,
    required this.onActionComplete,
  });

  @override
  State<_VerificationDetailView> createState() =>
      _VerificationDetailViewState();
}

class _VerificationDetailViewState extends State<_VerificationDetailView> {
  final _reasonCtrl = TextEditingController();
  bool _submitting = false;

  Future<void> _verifyRecord() async {
    setState(() => _submitting = true);
    try {
      await context
          .read<MaintenanceService>()
          .verify(widget.record.id, notes: _reasonCtrl.text.trim());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Maintenance verified and signed off!'),
            backgroundColor: AppColors.success,
          ),
        );
        widget.onActionComplete();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Verification error: $e'), backgroundColor: AppColors.critical),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _requestRework() async {
    if (_reasonCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter reason / required corrections.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await context.read<MaintenanceService>().requestCorrection(
            widget.record.id,
            requiredCorrections: _reasonCtrl.text.trim(),
            notes: 'Field rework requested by Supervisor',
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Rework requested. Record returned to worker.'),
            backgroundColor: AppColors.warning,
          ),
        );
        widget.onActionComplete();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.critical),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.record;
    final safety = r.aiSafetyAnalysis;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Details
          Text(
            r.workOrderTitle ?? r.description,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Type: ${r.maintenanceType} • Labour: ${r.labourHours} hrs',
            style: const TextStyle(fontSize: 13, color: AppColors.slate600),
          ),
          if (r.materialsUsed != null) ...[
            const SizedBox(height: 4),
            Text(
              'Materials: ${r.materialsUsed}',
              style: const TextStyle(fontSize: 12, color: AppColors.slate700),
            ),
          ],
          if (r.equipmentUsed != null) ...[
            const SizedBox(height: 4),
            Text(
              'Equipment: ${r.equipmentUsed}',
              style: const TextStyle(fontSize: 12, color: AppColors.slate700),
            ),
          ],
          if (r.workerNotes != null) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(10),
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppColors.slate100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                'Worker Notes: ${r.workerNotes}',
                style: const TextStyle(fontSize: 12, color: AppColors.slate800),
              ),
            ),
          ],

          const SizedBox(height: 16),

          // Safety AI Section
          if (safety != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: safety.complianceStatus.toLowerCase() == 'compliant'
                    ? AppColors.success.withValues(alpha: 0.08)
                    : AppColors.critical.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: safety.complianceStatus.toLowerCase() == 'compliant'
                      ? AppColors.success.withValues(alpha: 0.3)
                      : AppColors.critical.withValues(alpha: 0.3),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Safety AI Audit',
                        style: TextStyle(
                            fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '${(safety.confidenceScore * 100).toInt()}% Confidence',
                        style: const TextStyle(
                            fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Status: ${safety.complianceStatus.toUpperCase()}',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: safety.complianceStatus.toLowerCase() == 'compliant'
                          ? AppColors.success
                          : AppColors.critical,
                    ),
                  ),
                  if (safety.identifiedRisks.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      'Risks: ${safety.identifiedRisks.join(", ")}',
                      style: const TextStyle(
                          fontSize: 11, color: AppColors.critical),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Reason / Feedback Input
          CivicTextField(
            controller: _reasonCtrl,
            label: 'Audit Feedback / Correction Notes',
            hintText: 'Enter notes or reason if requesting rework...',
            maxLines: 3,
          ),
          const SizedBox(height: 16),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: CivicButton(
                  label: 'Request Rework',
                  type: CivicButtonType.danger,
                  isLoading: _submitting,
                  onPressed: _requestRework,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CivicButton(
                  label: 'Verify & Sign-off',
                  type: CivicButtonType.success,
                  isLoading: _submitting,
                  onPressed: _verifyRecord,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
