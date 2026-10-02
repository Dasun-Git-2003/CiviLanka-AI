import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../core/widgets/civic_badge.dart';
import '../../models/work_order.dart';
import '../../services/work_order_service.dart';
import '../../theme/app_colors.dart';

class SupervisorBudgetScreen extends StatefulWidget {
  const SupervisorBudgetScreen({Key? key}) : super(key: key);

  @override
  State<SupervisorBudgetScreen> createState() => _SupervisorBudgetScreenState();
}

class _SupervisorBudgetScreenState extends State<SupervisorBudgetScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  
  double _totalEstimatedCost = 0;
  double _totalApprovedBudget = 0;
  double _totalActualCost = 0;
  double _budgetVariance = 0;
  
  Map<String, int> _workOrdersByStatus = {};
  List<WorkOrder> _topExpensiveOrders = [];

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
      final workOrderService = context.read<WorkOrderService>();
      final orders = await workOrderService.getWorkOrders();
      
      _calculateBudgetMetrics(orders);
      
      if (mounted) {
        setState(() {
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

  void _calculateBudgetMetrics(List<WorkOrder> orders) {
    double estCost = 0;
    double appBudget = 0;
    double actCost = 0;
    Map<String, int> statusCount = {};

    for (var order in orders) {
      estCost += order.estimatedCost ?? 0;
      appBudget += order.approvedBudget ?? 0;
      actCost += order.actualCost ?? 0;

      final status = order.status;
      statusCount[status] = (statusCount[status] ?? 0) + 1;
    }

    // Top 5 expensive orders by actual cost (or estimated if actual is 0)
    var sortedOrders = List<WorkOrder>.from(orders);
    sortedOrders.sort((a, b) {
      final valA = (a.actualCost != null && a.actualCost! > 0) ? a.actualCost! : (a.estimatedCost ?? 0);
      final valB = (b.actualCost != null && b.actualCost! > 0) ? b.actualCost! : (b.estimatedCost ?? 0);
      return valB.compareTo(valA);
    });

    _totalEstimatedCost = estCost;
    _totalApprovedBudget = appBudget;
    _totalActualCost = actCost;
    _budgetVariance = _totalApprovedBudget - _totalActualCost;
    
    _workOrdersByStatus = statusCount;
    _topExpensiveOrders = sortedOrders.take(5).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('Budget Overview'),
        backgroundColor: AppColors.slate900,
        foregroundColor: AppColors.warning,
        elevation: 0,
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
      return const Center(child: CircularProgressIndicator(color: AppColors.warning));
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

    final currencyFormat = NumberFormat.compactCurrency(symbol: 'LKR ', decimalDigits: 2);

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // KPI Grid
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.3,
            children: [
              CivicStatCard(
                title: 'Est. Cost',
                value: currencyFormat.format(_totalEstimatedCost),
                icon: Icons.assessment,
                iconColor: AppColors.primary,
              ),
              CivicStatCard(
                title: 'Approved',
                value: currencyFormat.format(_totalApprovedBudget),
                icon: Icons.account_balance_wallet,
                iconColor: AppColors.success,
              ),
              CivicStatCard(
                title: 'Actual Spend',
                value: currencyFormat.format(_totalActualCost),
                icon: Icons.money_off,
                iconColor: AppColors.purple,
              ),
              CivicStatCard(
                title: 'Variance',
                value: currencyFormat.format(_budgetVariance),
                icon: _budgetVariance >= 0 ? Icons.trending_up : Icons.trending_down,
                iconColor: _budgetVariance >= 0 ? AppColors.success : AppColors.critical,
                subtitle: _budgetVariance >= 0 ? 'Under budget' : 'Over budget',
              ),
            ],
          ),
          
          const SizedBox(height: 24),
          
          Text(
            'Work Orders by Status',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                ),
          ),
          const SizedBox(height: 12),
          CivicCard(
            child: _workOrdersByStatus.isEmpty
                ? const Text('No data available', style: TextStyle(color: AppColors.textGrey))
                : Column(
                    children: _workOrdersByStatus.entries.map((e) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8.0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            CivicStatusBadge(status: e.key),
                            Text(
                              '${e.value} Orders',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
          ),

          const SizedBox(height: 24),
          
          Text(
            'Top Expensive Work Orders',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                ),
          ),
          const SizedBox(height: 12),
          if (_topExpensiveOrders.isEmpty)
            const CivicEmptyState(
              icon: Icons.receipt_long,
              title: 'No Work Orders',
              message: 'No data to show.',
            )
          else
            ..._topExpensiveOrders.map((order) {
              final costVal = (order.actualCost != null && order.actualCost! > 0) 
                  ? order.actualCost! 
                  : (order.estimatedCost ?? 0);
              
              return Padding(
                padding: const EdgeInsets.only(bottom: 12.0),
                child: CivicCard(
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              order.title.isNotEmpty ? order.title : order.orderNumber,
                              style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textDark),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Status: ${order.status}',
                              style: const TextStyle(color: AppColors.textGrey, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            NumberFormat.currency(symbol: 'LKR ', decimalDigits: 0).format(costVal),
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.warning),
                          ),
                          Text(
                            (order.actualCost != null && order.actualCost! > 0) ? 'Actual' : 'Estimated',
                            style: const TextStyle(color: AppColors.textGrey, fontSize: 10),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
        ],
      ),
    );
  }
}
