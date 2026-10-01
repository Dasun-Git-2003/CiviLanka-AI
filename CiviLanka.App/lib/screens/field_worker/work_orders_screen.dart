import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../models/work_order.dart';
import '../../services/work_order_service.dart';
import '../../theme/app_colors.dart';
import 'create_maintenance_screen.dart';

class WorkOrdersScreen extends StatefulWidget {
  const WorkOrdersScreen({super.key});

  @override
  State<WorkOrdersScreen> createState() => _WorkOrdersScreenState();
}

class _WorkOrdersScreenState extends State<WorkOrdersScreen> {
  List<WorkOrder> _workOrders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadWorkOrders();
  }

  Future<void> _loadWorkOrders() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final list = await context.read<WorkOrderService>().getAllWorkOrders();
      if (mounted) {
        setState(() {
          _workOrders = list;
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
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('Dispatched Work Orders', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.teal),
            onPressed: _loading ? null : _loadWorkOrders,
          ),
        ],
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
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _loadWorkOrders,
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.teal),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadWorkOrders,
                  color: AppColors.teal,
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _workOrders.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (ctx, i) => _buildWorkOrderCard(_workOrders[i]),
                  ),
                ),
    );
  }

  Widget _buildWorkOrderCard(WorkOrder wo) {
    Color priorityColor = AppColors.primary;
    if (wo.isCritical) priorityColor = AppColors.critical;
    if (wo.priority.toLowerCase() == 'high') priorityColor = AppColors.warning;

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
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: priorityColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        wo.priority.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: priorityColor,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      wo.orderNumber,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: AppColors.slate600,
                      ),
                    ),
                  ],
                ),
                Text(
                  wo.status.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.teal,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              wo.title,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textDark),
            ),
            const SizedBox(height: 4),
            Text(
              wo.description,
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
                    const Icon(Icons.account_balance_wallet_outlined, size: 14, color: AppColors.slate400),
                    const SizedBox(width: 4),
                    Text('Est: Rs. ${wo.estimatedCost?.toStringAsFixed(0) ?? "N/A"}', style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
                  ],
                ),
                Text(
                  'Created: ${DateFormat("MMM dd").format(wo.createdAt)}',
                  style: const TextStyle(fontSize: 11, color: AppColors.slate400),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => CreateMaintenanceScreen(initialWorkOrderId: wo.id),
                    ),
                  );
                },
                icon: const Icon(Icons.add_task, size: 16, color: AppColors.teal),
                label: const Text('Log Maintenance on this Order', style: TextStyle(color: AppColors.teal, fontWeight: FontWeight.bold, fontSize: 12)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.teal),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
