import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../models/work_order.dart';
import '../../services/work_order_service.dart';
import '../../services/analytics_service.dart';
import '../../core/widgets/civic_card.dart';
import '../../theme/app_colors.dart';
import '../../core/widgets/civic_states.dart';

class DirectorBudgetScreen extends StatefulWidget {
  const DirectorBudgetScreen({super.key});

  @override
  State<DirectorBudgetScreen> createState() => _DirectorBudgetScreenState();
}

class _DirectorBudgetScreenState extends State<DirectorBudgetScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<WorkOrder> _workOrders = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final woService = context.read<WorkOrderService>();
      final analyticsService = context.read<AnalyticsService>();
      
      final wos = await woService.getWorkOrders();
      try {
        await analyticsService.getVisualizations(); // Load for potential cache/side effects
      } catch (_) {
        // Ignore analytics service errors for now if it fails
      }
      
      if (!mounted) return;
      setState(() {
        _workOrders = wos;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  double _getTotalSpend() {
    return _workOrders.fold(0.0, (sum, wo) => sum + (wo.actualCost ?? 0.0));
  }

  double _getApprovedBudget() {
    return _workOrders.fold(0.0, (sum, wo) => sum + (wo.approvedBudget ?? 0.0));
  }

  double _getPendingApprovalsCost() {
    return _workOrders
        .where((wo) => wo.approvalStatus == 'PENDING_APPROVAL')
        .fold(0.0, (sum, wo) => sum + (wo.estimatedCost ?? 0.0));
  }

  double _getAvgCostPerWorkOrder() {
    if (_workOrders.isEmpty) return 0.0;
    return _getTotalSpend() / _workOrders.length;
  }

  String _formatCurrency(double amount) {
    return NumberFormat.currency(symbol: 'LKR ', decimalDigits: 0).format(amount);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('Budget & Treasury'),
        backgroundColor: AppColors.slate900,
        foregroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.warning),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: AppColors.warning,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: CivicSkeletonList(itemCount: 5),
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

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildKPIs(),
          const SizedBox(height: 24),
          _buildStatusBreakdown(),
          const SizedBox(height: 24),
          _buildBudgetByCategory(),
          const SizedBox(height: 24),
          _buildRecentHighValue(),
        ],
      ),
    );
  }

  Widget _buildKPIs() {
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.2,
      children: [
        CivicStatCard(
          title: 'Total Spend',
          value: _formatCurrency(_getTotalSpend()),
          icon: Icons.account_balance_wallet,
          iconColor: AppColors.critical,
        ),
        CivicStatCard(
          title: 'Approved Budget',
          value: _formatCurrency(_getApprovedBudget()),
          icon: Icons.check_circle,
          iconColor: AppColors.success,
        ),
        CivicStatCard(
          title: 'Pending Approvals',
          value: _formatCurrency(_getPendingApprovalsCost()),
          icon: Icons.pending_actions,
          iconColor: AppColors.warning,
        ),
        CivicStatCard(
          title: 'Avg Cost / WO',
          value: _formatCurrency(_getAvgCostPerWorkOrder()),
          icon: Icons.analytics,
          iconColor: AppColors.info,
        ),
      ],
    );
  }

  Widget _buildStatusBreakdown() {
    final statuses = ['APPROVED', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];
    final counts = {
      for (var s in statuses)
        s: _workOrders.where((w) => w.status == s || w.approvalStatus == s).length
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Status Breakdown',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.slate900,
          ),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: statuses.map((status) {
              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: Chip(
                  label: Text('$status: ${counts[status]}'),
                  backgroundColor: AppColors.slate100,
                  side: const BorderSide(color: AppColors.slate200),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildBudgetByCategory() {
    final Map<String, double> categorySpend = {};
    for (var wo in _workOrders) {
      final cat = wo.hazardCategory ?? 'Uncategorized';
      categorySpend[cat] = (categorySpend[cat] ?? 0) + (wo.actualCost ?? wo.estimatedCost ?? 0.0);
    }

    final maxSpend = categorySpend.values.fold(0.0, (m, v) => v > m ? v : m);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Budget by Category',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.slate900,
          ),
        ),
        const SizedBox(height: 12),
        if (categorySpend.isEmpty)
          const Text('No data available.', style: TextStyle(color: AppColors.slate500)),
        ...categorySpend.entries.map((e) {
          final percentage = maxSpend > 0 ? e.value / maxSpend : 0.0;
          return Padding(
            padding: const EdgeInsets.only(bottom: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(e.key, style: const TextStyle(fontWeight: FontWeight.w500)),
                    Text(_formatCurrency(e.value), style: const TextStyle(color: AppColors.slate600)),
                  ],
                ),
                const SizedBox(height: 4),
                LinearProgressIndicator(
                  value: percentage,
                  backgroundColor: AppColors.slate200,
                  color: AppColors.warning,
                  minHeight: 8,
                  borderRadius: BorderRadius.circular(4),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildRecentHighValue() {
    final sortedWOs = List<WorkOrder>.from(_workOrders)
      ..sort((a, b) => (b.estimatedCost ?? 0.0).compareTo(a.estimatedCost ?? 0.0));
    
    final topWOs = sortedWOs.take(10).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'High-Value Work Orders',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.slate900,
          ),
        ),
        const SizedBox(height: 12),
        if (topWOs.isEmpty)
          const CivicEmptyState(
            title: 'No Work Orders',
            message: 'No work orders found.',
            icon: Icons.assignment_outlined,
          ),
        ...topWOs.map((wo) => Padding(
          padding: const EdgeInsets.only(bottom: 8.0),
          child: CivicCard(
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        wo.title,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        wo.workOrderNumber,
                        style: const TextStyle(fontSize: 12, color: AppColors.slate500),
                      ),
                    ],
                  ),
                ),
                Text(
                  _formatCurrency(wo.estimatedCost ?? 0.0),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.critical,
                  ),
                ),
              ],
            ),
          ),
        )),
      ],
    );
  }
}
