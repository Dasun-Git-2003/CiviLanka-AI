import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/work_order.dart';
import '../services/auth_service.dart';
import '../services/work_order_service.dart';
import 'create_work_order_screen.dart';
import 'work_order_details_screen.dart';

class WorkOrderListScreen extends StatefulWidget {
  const WorkOrderListScreen({super.key});

  @override
  State<WorkOrderListScreen> createState() => _WorkOrderListScreenState();
}

class _WorkOrderListScreenState extends State<WorkOrderListScreen> {
  List<WorkOrder> _workOrders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await context.read<WorkOrderService>().getWorkOrders();
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
    final canCreate =
        context.read<AuthService>().currentUser?.canCreateWorkOrders ?? false;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Work Orders'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: _load,
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _buildBody(),
      ),
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              onPressed: () async {
                final created = await Navigator.push<WorkOrder>(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const CreateWorkOrderScreen(),
                  ),
                );
                if (created != null && mounted) {
                  _load();
                }
              },
              icon: const Icon(Icons.add),
              label: const Text('New Work Order'),
            )
          : null,
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.red, fontSize: 14),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _load,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_workOrders.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 120),
          Center(
            child: Column(
              children: [
                Icon(Icons.assignment_outlined, size: 72, color: Colors.grey),
                SizedBox(height: 16),
                Text(
                  'No work orders available.',
                  style: TextStyle(fontSize: 16, color: Colors.grey),
                ),
                SizedBox(height: 8),
                Text(
                  'Active municipal work orders will appear here.',
                  style: TextStyle(color: Colors.grey),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _workOrders.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, i) {
        final wo = _workOrders[i];
        return _WorkOrderCard(
          workOrder: wo,
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => WorkOrderDetailsScreen(workOrderId: wo.id),
            ),
          ).then((_) => _load()),
        );
      },
    );
  }
}

class _WorkOrderCard extends StatelessWidget {
  final WorkOrder workOrder;
  final VoidCallback onTap;

  const _WorkOrderCard({required this.workOrder, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fmt = DateFormat('dd MMM yyyy');
    final currencyFmt = NumberFormat.currency(
      locale: 'en_LK',
      symbol: 'Rs. ',
      decimalDigits: 0,
    );

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row: WO number + badges
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      workOrder.workOrderNumber.isNotEmpty
                          ? workOrder.workOrderNumber
                          : 'WO-${workOrder.id.substring(0, 8)}',
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                  const Spacer(),
                  _StatusChip(status: workOrder.status),
                ],
              ),
              const SizedBox(height: 8),

              // Title
              Text(
                workOrder.title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 4),

              // Description
              Text(
                workOrder.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 13, color: Colors.grey[700]),
              ),
              const SizedBox(height: 10),

              // Badges row: Priority, Arterial road, Approval required
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  _PriorityChip(priority: workOrder.priority),
                  if (workOrder.isArterialRoad)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.warning_amber_rounded,
                              size: 12, color: Colors.red.shade700),
                          const SizedBox(width: 3),
                          Text(
                            'Arterial Road',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.red.shade700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (workOrder.approvalRequired &&
                      workOrder.approvalStatus == 'PENDING')
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.amber.shade300),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.gavel_outlined,
                              size: 12, color: Colors.amber.shade900),
                          const SizedBox(width: 3),
                          Text(
                            'Approval Pending',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: Colors.amber.shade900,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 8),

              // Footer: Estimated cost + date
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  if (workOrder.estimatedCost != null)
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Estimated Cost',
                          style: TextStyle(fontSize: 10, color: Colors.grey),
                        ),
                        Text(
                          currencyFmt.format(workOrder.estimatedCost),
                          style: TextStyle(
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: Colors.green.shade700,
                          ),
                        ),
                      ],
                    )
                  else
                    const Text(
                      'No estimate yet',
                      style: TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                  Row(
                    children: [
                      Icon(Icons.calendar_today_outlined,
                          size: 12, color: Colors.grey[500]),
                      const SizedBox(width: 4),
                      Text(
                        fmt.format(workOrder.createdAt.toLocal()),
                        style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg = Colors.white;

    switch (status.toUpperCase()) {
      case 'AI_GENERATED':
        bg = Colors.indigo.shade600;
        break;
      case 'PENDING_APPROVAL':
        bg = Colors.amber.shade700;
        break;
      case 'APPROVED':
        bg = Colors.teal.shade600;
        break;
      case 'ASSIGNED':
      case 'SCHEDULED':
        bg = Colors.blue.shade600;
        break;
      case 'IN_PROGRESS':
        bg = Colors.purple.shade600;
        break;
      case 'COMPLETED':
      case 'VERIFIED':
      case 'CLOSED':
        bg = Colors.green.shade700;
        break;
      case 'REJECTED':
      case 'CANCELLED':
        bg = Colors.red.shade700;
        break;
      default:
        bg = Colors.grey.shade600;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          color: fg,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _PriorityChip extends StatelessWidget {
  final String priority;
  const _PriorityChip({required this.priority});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (priority.toUpperCase()) {
      case 'URGENT':
        color = Colors.red;
        break;
      case 'HIGH':
        color = Colors.orange;
        break;
      case 'NORMAL':
        color = Colors.blue;
        break;
      default:
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        priority.toUpperCase(),
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 10,
        ),
      ),
    );
  }
}
