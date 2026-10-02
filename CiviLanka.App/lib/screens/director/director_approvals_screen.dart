import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/widgets/civic_badge.dart';
import '../../core/widgets/civic_button.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../core/widgets/civic_text_field.dart';
import '../../models/work_order.dart';
import '../../services/work_order_service.dart';
import '../../theme/app_colors.dart';
import '../work_order_details_screen.dart';

class DirectorApprovalsScreen extends StatefulWidget {
  const DirectorApprovalsScreen({super.key});

  @override
  State<DirectorApprovalsScreen> createState() =>
      _DirectorApprovalsScreenState();
}

class _DirectorApprovalsScreenState extends State<DirectorApprovalsScreen> {
  List<WorkOrder> _workOrders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPendingApprovals();
  }

  Future<void> _loadPendingApprovals() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final list = await context.read<WorkOrderService>().getWorkOrders();
      final pending = list.where((w) => w.isApprovalPending).toList();
      setState(() {
        _workOrders = pending;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _showApprovalDialog(WorkOrder wo, bool isApproval) {
    final notesCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          isApproval ? 'Approve Work Order' : 'Reject / Request Changes',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isApproval
                  ? 'Confirm formal municipal authorization for ${wo.orderNumber} ($wo.title).'
                  : 'Specify the justification for rejection or required scope modifications.',
              style: const TextStyle(fontSize: 13, color: AppColors.slate600),
            ),
            const SizedBox(height: 12),
            CivicTextField(
              controller: notesCtrl,
              label: isApproval ? 'Approval Notes (Optional)' : 'Mandatory Reason',
              hintText: isApproval
                  ? 'E.g., Approved under Q3 road maintenance budget'
                  : 'E.g., Requires reassessment of equipment expenditure',
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          CivicButton(
            label: isApproval ? 'Authorize' : 'Submit Decision',
            type: isApproval ? CivicButtonType.success : CivicButtonType.danger,
            height: 38,
            onPressed: () async {
              if (!isApproval && notesCtrl.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('A reason is mandatory for rejection.')),
                );
                return;
              }

              Navigator.pop(ctx);
              _processApproval(wo, isApproval, notesCtrl.text.trim());
            },
          ),
        ],
      ),
    );
  }

  Future<void> _processApproval(WorkOrder wo, bool approve, String notes) async {
    try {
      final input = ApproveRejectInput(notes: notes);
      if (approve) {
        await context.read<WorkOrderService>().approveWorkOrder(wo.id, input);
      } else {
        await context.read<WorkOrderService>().rejectWorkOrder(wo.id, input);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(approve
                ? 'Work Order ${wo.orderNumber} approved!'
                : 'Work Order ${wo.orderNumber} rejected.'),
            backgroundColor: approve ? AppColors.success : AppColors.critical,
          ),
        );
        _loadPendingApprovals();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.critical),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text(
          'Executive Approvals',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPendingApprovals,
          ),
        ],
      ),
      body: _loading
          ? const CivicSkeletonList(itemCount: 4, height: 120)
          : _error != null
              ? Center(
                  child: CivicErrorCard(
                    message: _error!,
                    onRetry: _loadPendingApprovals,
                  ),
                )
              : _workOrders.isEmpty
                  ? const CivicEmptyState(
                      title: 'All Approvals Cleared',
                      message: 'There are no work orders currently awaiting Director sign-off.',
                      icon: Icons.check_circle_outline,
                    )
                  : RefreshIndicator(
                      onRefresh: _loadPendingApprovals,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _workOrders.length,
                        itemBuilder: (ctx, i) {
                          final wo = _workOrders[i];
                          return _DirectorApprovalCard(
                            workOrder: wo,
                            onApprove: () => _showApprovalDialog(wo, true),
                            onReject: () => _showApprovalDialog(wo, false),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) =>
                                      WorkOrderDetailsScreen(workOrderId: wo.id),
                                ),
                              );
                            },
                          );
                        },
                      ),
                    ),
    );
  }
}

class _DirectorApprovalCard extends StatelessWidget {
  final WorkOrder workOrder;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback onTap;

  const _DirectorApprovalCard({
    required this.workOrder,
    required this.onApprove,
    required this.onReject,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat.currency(symbol: 'LKR ', decimalDigits: 0);

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      child: CivicCard(
        padding: const EdgeInsets.all(16),
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  workOrder.orderNumber,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: AppColors.primaryDark,
                  ),
                ),
                CivicPriorityBadge(priority: workOrder.priority),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              workOrder.title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900),
            ),
            const SizedBox(height: 4),
            Text(
              workOrder.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, color: AppColors.slate600),
            ),
            const SizedBox(height: 12),

            // AI & Supervisor Recommendation row
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppColors.purple.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.purple.withValues(alpha: 0.2)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Estimated Budget',
                        style: TextStyle(fontSize: 11, color: AppColors.slate500),
                      ),
                      Text(
                        workOrder.estimatedCost != null
                            ? currencyFmt.format(workOrder.estimatedCost)
                            : 'Pending Cost AI',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.purple),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text(
                        'Supervisor Rec',
                        style: TextStyle(fontSize: 11, color: AppColors.slate500),
                      ),
                      Text(
                        workOrder.approvalReason.isNotEmpty
                            ? workOrder.approvalReason
                            : 'Approve',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.tealDark),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),
            const Divider(height: 1),
            const SizedBox(height: 10),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: CivicButton(
                    label: 'Reject / Changes',
                    type: CivicButtonType.danger,
                    height: 38,
                    onPressed: onReject,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: CivicButton(
                    label: 'Approve',
                    type: CivicButtonType.success,
                    height: 38,
                    onPressed: onApprove,
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
