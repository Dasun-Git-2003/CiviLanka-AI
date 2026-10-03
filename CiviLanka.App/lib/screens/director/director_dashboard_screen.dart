import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/widgets/civic_badge.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../models/work_order.dart';
import '../../services/hazard_service.dart';
import '../../services/work_order_service.dart';
import '../../theme/app_colors.dart';
import '../work_order_details_screen.dart';
import '../../widgets/municipal_app_drawer.dart';

class DirectorDashboardScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;

  const DirectorDashboardScreen({super.key, this.onNavigateTab});

  @override
  State<DirectorDashboardScreen> createState() =>
      _DirectorDashboardScreenState();
}

class _DirectorDashboardScreenState extends State<DirectorDashboardScreen> {
  bool _loading = true;
  String? _error;

  int _openHazardsCount = 0;
  int _activeWorkCount = 0;
  List<WorkOrder> _pendingApprovals = [];
  double _totalEstimatedSpend = 0.0;

  @override
  void initState() {
    super.initState();
    _loadDirectorData();
  }

  Future<void> _loadDirectorData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final hazardService = context.read<HazardService>();
      final workOrderService = context.read<WorkOrderService>();

      final hazards = await hazardService.getAllHazards();
      final workOrders = await workOrderService.getWorkOrders();

      final pending = workOrders.where((w) => w.isApprovalPending).toList();
      final active = workOrders
          .where((w) =>
              w.status.toUpperCase() == 'IN_PROGRESS' ||
              w.status.toUpperCase() == 'ASSIGNED' ||
              w.status.toUpperCase() == 'SCHEDULED')
          .length;

      double spend = 0.0;
      for (var w in workOrders) {
        if (w.actualCost != null && w.actualCost! > 0) {
          spend += w.actualCost!;
        } else if (w.estimatedCost != null && w.isApproved) {
          spend += w.estimatedCost!;
        }
      }

      setState(() {
        _openHazardsCount = hazards.where((h) => !h.isResolved).length;
        _activeWorkCount = active;
        _pendingApprovals = pending;
        _totalEstimatedSpend = spend;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat.currency(symbol: 'LKR ', decimalDigits: 0);

    return Scaffold(
      backgroundColor: AppColors.cityBg,
      drawer: const MunicipalAppDrawer(
        role: 'director',
        activeRoute: '/director-dashboard',
      ),
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            tooltip: 'Governance Menu',
            onPressed: () => Scaffold.of(ctx).openDrawer(),
          ),
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Public Works Overview',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
            ),
            Text(
              'Executive Municipal Command',
              style: TextStyle(fontSize: 11, color: AppColors.slate500),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadDirectorData,
          ),
        ],
      ),
      body: _loading
          ? const CivicSkeletonList(itemCount: 4, height: 90)
          : _error != null
              ? Center(
                  child: CivicErrorCard(
                    message: _error!,
                    onRetry: _loadDirectorData,
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadDirectorData,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Executive 2x2 KPIs
                        Row(
                          children: [
                            Expanded(
                              child: CivicStatCard(
                                title: 'Open Issues',
                                value: '$_openHazardsCount',
                                icon: Icons.report_problem_outlined,
                                iconColor: AppColors.critical,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: CivicStatCard(
                                title: 'Active Work',
                                value: '$_activeWorkCount',
                                icon: Icons.engineering_outlined,
                                iconColor: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: CivicStatCard(
                                title: 'Requires Approval',
                                value: '${_pendingApprovals.length}',
                                icon: Icons.gavel,
                                iconColor: AppColors.purple,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: CivicStatCard(
                                title: 'Fiscal Spend',
                                value: currencyFmt.format(_totalEstimatedSpend),
                                icon: Icons.account_balance_outlined,
                                iconColor: AppColors.teal,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Section: Requires Director Approval
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Requires Your Approval',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.slate900,
                              ),
                            ),
                            TextButton(
                              onPressed: () => widget.onNavigateTab?.call(2), // Approvals tab
                              child: const Text('Review All', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        if (_pendingApprovals.isEmpty)
                          const CivicCard(
                            child: Padding(
                              padding: EdgeInsets.symmetric(vertical: 8.0),
                              child: Text(
                                'All municipal work orders are currently signed off.',
                                style: TextStyle(color: AppColors.slate500, fontSize: 13),
                              ),
                            ),
                          )
                        else
                          ..._pendingApprovals.take(3).map((w) => _buildApprovalPreviewCard(w)),

                        const SizedBox(height: 24),

                        // Quick AI Insights banner
                        CivicCard(
                          padding: const EdgeInsets.all(16),
                          backgroundColor: AppColors.purple.withValues(alpha: 0.05),
                          borderColor: AppColors.purple.withValues(alpha: 0.25),
                          onTap: () => widget.onNavigateTab?.call(3), // AI Insights tab
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppColors.purple.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.auto_awesome, color: AppColors.purple, size: 24),
                              ),
                              const SizedBox(width: 14),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Cross-Agency AI Insights',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.slate900,
                                      ),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      'View telemetry, risk maps, and decision audit logs.',
                                      style: TextStyle(fontSize: 12, color: AppColors.slate600),
                                    ),
                                  ],
                                ),
                              ),
                              const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.slate400),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildApprovalPreviewCard(WorkOrder wo) {
    final currencyFmt = NumberFormat.currency(symbol: 'LKR ', decimalDigits: 0);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: CivicCard(
        padding: const EdgeInsets.all(14),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => WorkOrderDetailsScreen(workOrderId: wo.id),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  wo.orderNumber,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: AppColors.primaryDark,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.purple.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors.purple.withValues(alpha: 0.3)),
                  ),
                  child: const Text(
                    'SIGN-OFF REQUIRED',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.purple),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              wo.title,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.slate900),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  wo.estimatedCost != null
                      ? 'Budget: ${currencyFmt.format(wo.estimatedCost)}'
                      : 'No estimate',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700),
                ),
                CivicPriorityBadge(priority: wo.priority),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
