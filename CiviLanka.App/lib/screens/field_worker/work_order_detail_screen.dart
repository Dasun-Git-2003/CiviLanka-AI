import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../models/work_order.dart';
import '../../services/work_order_service.dart';
import '../../theme/app_colors.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_badge.dart';
import '../../core/widgets/civic_button.dart';
import '../../core/widgets/civic_states.dart';

class WorkOrderDetailScreen extends StatefulWidget {
  final String workOrderId;

  const WorkOrderDetailScreen({required this.workOrderId, super.key});

  @override
  State<WorkOrderDetailScreen> createState() => _WorkOrderDetailScreenState();
}

class _WorkOrderDetailScreenState extends State<WorkOrderDetailScreen> {
  bool _isLoading = true;
  String? _error;
  WorkOrder? _workOrder;
  bool _isActionLoading = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = context.read<WorkOrderService>();
      final wo = await service.getWorkOrderById(widget.workOrderId);
      if (mounted) {
        setState(() {
          _workOrder = wo;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _updateStatus(String newStatus) async {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    setState(() => _isActionLoading = true);

    try {
      final service = context.read<WorkOrderService>();
      await service.updateWorkOrder(
        widget.workOrderId,
        UpdateWorkOrderInput(status: newStatus),
      );
      if (mounted) {
        scaffoldMessenger.showSnackBar(
          SnackBar(
            content: Text('Status updated to ${newStatus.replaceAll('_', ' ')}'),
            backgroundColor: AppColors.teal,
          ),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        scaffoldMessenger.showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.critical),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isActionLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('Work Order Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: AppColors.teal,
        foregroundColor: Colors.white,
      ),
      body: _buildBody(),
      bottomNavigationBar: _buildBottomActionBar(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: CivicSkeletonList(itemCount: 3),
      );
    }
    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Center(
          child: CivicErrorCard(
            message: _error!,
            onRetry: _loadData,
          ),
        ),
      );
    }
    if (_workOrder == null) {
      return const Center(child: Text('Work order not found'));
    }

    final wo = _workOrder!;

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppColors.teal,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(wo),
            const SizedBox(height: 16),
            _buildLocationInfo(wo),
            const SizedBox(height: 16),
            _buildDescription(wo),
            const SizedBox(height: 16),
            _buildJobDetails(wo),
            const SizedBox(height: 16),
            _buildCostInfo(wo),
            if (wo.hazardId != null && wo.hazardId!.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildHazardInfo(wo),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(WorkOrder wo) {
    return CivicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                wo.orderNumber,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.slate900),
              ),
              CivicStatusBadge(status: wo.status),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            wo.title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textDark),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              CivicPriorityBadge(priority: wo.priority),
              const SizedBox(width: 12),
              const Icon(Icons.calendar_today, size: 14, color: AppColors.slate500),
              const SizedBox(width: 4),
              Text(
                DateFormat.yMMMd().format(wo.createdAt),
                style: const TextStyle(fontSize: 12, color: AppColors.slate600),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLocationInfo(WorkOrder wo) {
    if (wo.hazardAddress == null && (wo.hazardLatitude == null || wo.hazardLongitude == null)) {
      return const SizedBox.shrink();
    }
    return CivicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.location_on, color: AppColors.teal, size: 18),
              SizedBox(width: 8),
              Text('Location', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ],
          ),
          const SizedBox(height: 12),
          if (wo.hazardAddress != null && wo.hazardAddress!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Text(wo.hazardAddress!, style: const TextStyle(fontSize: 14, color: AppColors.slate700)),
            ),
          if (wo.hazardLatitude != null && wo.hazardLongitude != null)
            Text(
              'Lat: ${wo.hazardLatitude}, Lng: ${wo.hazardLongitude}',
              style: const TextStyle(fontSize: 12, color: AppColors.slate500),
            ),
        ],
      ),
    );
  }

  Widget _buildDescription(WorkOrder wo) {
    return CivicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Description', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Text(
            wo.description,
            style: const TextStyle(fontSize: 14, color: AppColors.slate700),
          ),
        ],
      ),
    );
  }

  Widget _buildJobDetails(WorkOrder wo) {
    return CivicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Job Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildDetailItem(Icons.schedule, 'Duration', wo.estimatedDurationHours != null ? '${wo.estimatedDurationHours} hrs' : 'N/A'),
              _buildDetailItem(Icons.group, 'Crew Size', wo.recommendedCrewSize != null ? '${wo.recommendedCrewSize} workers' : 'N/A'),
              _buildDetailItem(Icons.event_available, 'Scheduled', wo.scheduledDate != null ? DateFormat('MMM dd').format(wo.scheduledDate!) : 'TBD'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDetailItem(IconData icon, String label, String value) {
    return Column(
      children: [
        Icon(icon, color: AppColors.teal, size: 20),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate800)),
      ],
    );
  }

  Widget _buildCostInfo(WorkOrder wo) {
    final formatCurrency = NumberFormat.currency(symbol: 'LKR ', decimalDigits: 0);
    return CivicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Estimated Cost', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Text(
            wo.estimatedCost != null ? formatCurrency.format(wo.estimatedCost) : 'Pending Estimation',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
        ],
      ),
    );
  }

  Widget _buildHazardInfo(WorkOrder wo) {
    return CivicCard(
      backgroundColor: AppColors.warning.withValues(alpha: 0.05),
      borderColor: AppColors.warning.withValues(alpha: 0.2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 18),
              SizedBox(width: 8),
              Text('Linked Hazard', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.slate900)),
            ],
          ),
          const SizedBox(height: 12),
          Text('Ticket: ${wo.hazardTicket ?? "Unknown"}', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          if (wo.hazardCategory != null) Text('Category: ${wo.hazardCategory}', style: const TextStyle(fontSize: 13)),
          if (wo.hazardSeverity != null) Text('Severity: ${wo.hazardSeverity}', style: const TextStyle(fontSize: 13)),
          if (wo.hazardDescription != null) ...[
            const SizedBox(height: 8),
            Text(wo.hazardDescription!, style: const TextStyle(fontSize: 12, color: AppColors.slate600)),
          ]
        ],
      ),
    );
  }

  Widget? _buildBottomActionBar() {
    if (_workOrder == null) return null;
    final status = _workOrder!.status.toUpperCase();
    
    if (status == 'ASSIGNED' || status == 'SCHEDULED') {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))
          ],
        ),
        child: CivicButton(
          label: 'Start Work',
          icon: Icons.play_arrow,
          onPressed: () => _showConfirmationDialog('Start Work', 'Are you sure you want to start this work order?', 'IN_PROGRESS'),
          isLoading: _isActionLoading,
        ),
      );
    } else if (status == 'IN_PROGRESS' || status == 'INPROGRESS') {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, -2))
          ],
        ),
        child: CivicButton(
          label: 'Mark Complete',
          icon: Icons.check_circle,
          type: CivicButtonType.success,
          onPressed: () => _showConfirmationDialog('Mark Complete', 'Are you sure you want to mark this work order as completed?', 'COMPLETED'),
          isLoading: _isActionLoading,
        ),
      );
    }
    return null;
  }

  Future<void> _showConfirmationDialog(String title, String content, String newStatus) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.teal),
            child: const Text('Confirm', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    if (confirm == true) {
      _updateStatus(newStatus);
    }
  }
}
