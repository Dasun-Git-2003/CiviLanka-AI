import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../core/widgets/civic_button.dart';
import '../../core/widgets/civic_badge.dart';
import '../../models/maintenance_record.dart';
import '../../services/maintenance_service.dart';
import '../../theme/app_colors.dart';

class SupervisorVerificationQueueScreen extends StatefulWidget {
  const SupervisorVerificationQueueScreen({Key? key}) : super(key: key);

  @override
  State<SupervisorVerificationQueueScreen> createState() =>
      _SupervisorVerificationQueueScreenState();
}

class _SupervisorVerificationQueueScreenState
    extends State<SupervisorVerificationQueueScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<MaintenanceRecord> _records = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final maintenanceService = context.read<MaintenanceService>();
      final records = await maintenanceService.getPendingVerification();
      if (mounted) {
        setState(() {
          _records = records;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _approveRecord(MaintenanceRecord record) async {
    try {
      final maintenanceService = context.read<MaintenanceService>();
      await maintenanceService.verify(record.id);
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Maintenance verified successfully.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to verify: $e')),
        );
      }
    }
  }

  Future<void> _requestCorrection(MaintenanceRecord record, String notes) async {
    try {
      final maintenanceService = context.read<MaintenanceService>();
      await maintenanceService.requestCorrection(record.id, requiredCorrections: notes);
      await _loadData();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Correction requested successfully.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to request correction: $e')),
        );
      }
    }
  }

  void _showCorrectionBottomSheet(MaintenanceRecord record) {
    final noteController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Request Correction',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.textDark,
                    ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: noteController,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Enter reason for correction...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Cancel'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.purple,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {
                      final notes = noteController.text.trim();
                      if (notes.isNotEmpty) {
                        Navigator.pop(ctx);
                        _requestCorrection(record, notes);
                      }
                    },
                    child: const Text('Submit'),
                  ),
                ],
              )
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('Verification Queue'),
        backgroundColor: AppColors.slate900,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: AppColors.purple,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: CivicSkeletonList(),
      );
    }

    if (_errorMessage != null) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: CivicErrorCard(
          message: _errorMessage!,
          onRetry: _loadData,
        ),
      );
    }

    if (_records.isEmpty) {
      return CivicEmptyState(
        icon: Icons.check_circle_outline,
        title: 'Queue Clear',
        message: 'All maintenance tasks verified!',
        actionLabel: 'Refresh',
        onAction: _loadData,
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _records.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final record = _records[index];
        final currencyFormat = NumberFormat.currency(symbol: 'LKR ', decimalDigits: 0);
        final completedDate = record.workCompletedAt != null
            ? DateFormat('MMM d, yyyy').format(record.workCompletedAt!)
            : 'Unknown';

        return CivicCard(
          onTap: () {},
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      record.workOrderTitle ?? 'Maintenance #${record.workOrderId.substring(0, 8)}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  CivicStatusBadge(status: record.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                record.maintenanceType,
                style: TextStyle(color: AppColors.purple, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.calendar_today, size: 16, color: AppColors.textGrey),
                  const SizedBox(width: 4),
                  Text('Completed: $completedDate', style: const TextStyle(color: AppColors.textGrey)),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.timer, size: 16, color: AppColors.textGrey),
                  const SizedBox(width: 4),
                  Text('Hours: ${record.labourHours}', style: const TextStyle(color: AppColors.textGrey)),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.attach_money, size: 16, color: AppColors.textGrey),
                  const SizedBox(width: 4),
                  Text('Cost: ${currencyFormat.format(record.actualCost)}', style: const TextStyle(color: AppColors.textGrey)),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: CivicButton(
                      label: 'Correction',
                      icon: Icons.close,
                      type: CivicButtonType.outline,
                      onPressed: () => _showCorrectionBottomSheet(record),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CivicButton(
                      label: 'Approve',
                      icon: Icons.check,
                      type: CivicButtonType.primary,
                      onPressed: () => _approveRecord(record),
                    ),
                  ),
                ],
              )
            ],
          ),
        );
      },
    );
  }
}
