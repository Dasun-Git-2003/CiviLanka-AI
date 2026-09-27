import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/work_order.dart';
import '../services/auth_service.dart';
import '../services/work_order_service.dart';
import '../widgets/cost_estimate_card.dart';
import 'edit_work_order_screen.dart';

class WorkOrderDetailsScreen extends StatefulWidget {
  final String workOrderId;

  const WorkOrderDetailsScreen({super.key, required this.workOrderId});

  @override
  State<WorkOrderDetailsScreen> createState() => _WorkOrderDetailsScreenState();
}

class _WorkOrderDetailsScreenState extends State<WorkOrderDetailsScreen> {
  WorkOrder? _workOrder;
  bool _loading = true;
  String? _error;
  bool _estimating = false;
  bool _submittingApproval = false;

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
      final wo = await context
          .read<WorkOrderService>()
          .getWorkOrderById(widget.workOrderId);
      if (mounted) {
        setState(() {
          _workOrder = wo;
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

  Future<void> _navigateToEdit() async {
    final updated = await Navigator.push<WorkOrder>(
      context,
      MaterialPageRoute(
        builder: (_) => EditWorkOrderScreen(workOrder: _workOrder!),
      ),
    );
    if (updated != null && mounted) {
      setState(() => _workOrder = updated);
    }
  }

  Future<void> _confirmCancel() async {
    final wo = _workOrder;
    if (wo == null) return;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Work Order?'),
        content: Text(
          'Are you sure you want to cancel Work Order ${wo.workOrderNumber}? This marks the order as CANCELLED in the municipal registry and preserves the safety audit trail.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep Order'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'Cancel Order',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        await context.read<WorkOrderService>().cancelWorkOrder(wo.id);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Work Order ${wo.workOrderNumber} was cancelled.'),
              backgroundColor: Colors.orange.shade800,
            ),
          );
          _load();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.toString()),
              backgroundColor: Colors.red.shade700,
            ),
          );
        }
      }
    }
  }

  Future<void> _generateEstimate() async {
    final wo = _workOrder;
    if (wo == null || _estimating) return;

    setState(() => _estimating = true);

    try {
      final updated =
          await context.read<WorkOrderService>().generateCostEstimate(wo.id);

      if (mounted) {
        setState(() {
          _workOrder = updated;
          _estimating = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Cost estimate generated successfully for ${updated.workOrderNumber}!',
            ),
            backgroundColor: Colors.green.shade700,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _estimating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    }
  }

  Future<void> _confirmApprove() async {
    final wo = _workOrder;
    if (wo == null || _submittingApproval) return;

    final notesController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.check_circle_outline, color: Colors.green),
            SizedBox(width: 8),
            Text('Approve Work Order'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'You are approving Work Order ${wo.workOrderNumber}.\n\n'
                'This will formally transition the order status to APPROVED in the municipal registry and authorize maintenance execution.',
                style: const TextStyle(fontSize: 13, height: 1.4),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: notesController,
                maxLength: 1000,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Approval Notes (Optional)',
                  hintText:
                      'e.g. Budget authorized, proceed with crew deployment.',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.check_circle_outline, size: 18),
            label: const Text('Approve Work Order'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green.shade700,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _submittingApproval = true);
      try {
        final notes = notesController.text.trim();
        final updated = await context.read<WorkOrderService>().approveWorkOrder(
              wo.id,
              ApproveRejectInput(notes: notes.isNotEmpty ? notes : null),
            );
        if (mounted) {
          setState(() {
            _workOrder = updated;
            _submittingApproval = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Work Order ${updated.workOrderNumber} was approved successfully.',
              ),
              backgroundColor: Colors.green.shade700,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() => _submittingApproval = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.toString()),
              backgroundColor: Colors.red.shade700,
            ),
          );
        }
      }
    }
  }

  Future<void> _confirmReject() async {
    final wo = _workOrder;
    if (wo == null || _submittingApproval) return;

    final reasonController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.cancel_outlined, color: Colors.red),
            SizedBox(width: 8),
            Text('Reject Work Order'),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'You are rejecting Work Order ${wo.workOrderNumber}.\n\n'
                'Rejection indicates this work order is not authorized by the Public Works Director. (Note: Rejection is distinct from cancellation.)',
                style: const TextStyle(fontSize: 13, height: 1.4),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: reasonController,
                maxLength: 1000,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Rejection notes (optional)',
                  hintText:
                      'e.g. Scope requires revision by district engineer.',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Keep Under Review'),
          ),
          ElevatedButton.icon(
            onPressed: () => Navigator.pop(ctx, true),
            icon: const Icon(Icons.cancel_outlined, size: 18),
            label: const Text('Reject Work Order'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade700,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      setState(() => _submittingApproval = true);
      try {
        final reason = reasonController.text.trim();
        final updated = await context.read<WorkOrderService>().rejectWorkOrder(
              wo.id,
              ApproveRejectInput(notes: reason.isNotEmpty ? reason : null),
            );
        if (mounted) {
          setState(() {
            _workOrder = updated;
            _submittingApproval = false;
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Work Order ${updated.workOrderNumber} was rejected.',
              ),
              backgroundColor: Colors.red.shade700,
            ),
          );
        }
      } catch (e) {
        if (mounted) {
          setState(() => _submittingApproval = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(e.toString()),
              backgroundColor: Colors.red.shade700,
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Work Order Details')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null || _workOrder == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Work Order Details')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  _error ?? 'Work order not found.',
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
        ),
      );
    }

    final wo = _workOrder!;
    final fmt = DateFormat('dd MMM yyyy, h:mm a');
    final currencyFmt = NumberFormat.currency(
      locale: 'en_LK',
      symbol: 'Rs. ',
      decimalDigits: 0,
    );

    final auth = context.read<AuthService>();
    final user = auth.currentUser;
    final canManage = user?.canManageWorkOrders ?? false;
    final canApproveOrReject =
        (user?.canApproveWorkOrders ?? false) && wo.isApprovalPending;
    final canEstimate = (user?.canGenerateEstimate ?? false) &&
        !wo.isCancelled &&
        wo.status.toUpperCase() != 'CANCELLED' &&
        wo.status.toUpperCase() != 'CLOSED';
    final isEditable = canManage &&
        !wo.isCancelled &&
        wo.status.toUpperCase() != 'CANCELLED' &&
        wo.status.toUpperCase() != 'CLOSED';
    final isCancellable =
        canManage && !wo.isCancelled && wo.status.toUpperCase() != 'CANCELLED';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          wo.workOrderNumber.isNotEmpty ? wo.workOrderNumber : 'Work Order',
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: _load,
          ),
          if (canEstimate)
            IconButton(
              icon: _estimating
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.auto_awesome),
              tooltip: 'Generate AI Cost Estimate',
              onPressed: _estimating ? null : _generateEstimate,
            ),
          if (isEditable)
            IconButton(
              icon: const Icon(Icons.edit_outlined),
              tooltip: 'Edit Work Order',
              onPressed: _navigateToEdit,
            ),
          if (isCancellable)
            IconButton(
              icon: const Icon(Icons.cancel_outlined),
              tooltip: 'Cancel Work Order',
              color: Colors.white,
              onPressed: _confirmCancel,
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header Status & Priority Row ──────────────────────────────
              Row(
                children: [
                  _StatusChip(status: wo.status),
                  const SizedBox(width: 8),
                  _PriorityChip(priority: wo.priority),
                  if (wo.isArterialRoad) ...[
                    const SizedBox(width: 8),
                    _ArterialRoadBadge(),
                  ],
                ],
              ),
              const SizedBox(height: 16),

              // ── Title & Description ───────────────────────────────────────
              Text(
                wo.title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                wo.description,
                style: const TextStyle(fontSize: 14, height: 1.4),
              ),
              const SizedBox(height: 20),

              // ── Governance & Director Approval ────────────────────────────
              _buildApprovalBanner(wo, canApproveOrReject),
              const SizedBox(height: 20),

              // ── Financial Summary Card ────────────────────────────────────
              _buildFinancialCard(wo, currencyFmt),
              const SizedBox(height: 20),

              // ── Operational & Schedule Details ────────────────────────────
              _buildOperationalCard(wo, fmt),
              const SizedBox(height: 20),

              // ── AI Cost & Material Estimation ─────────────────────────────
              CostEstimateCard(
                workOrder: wo,
                canEstimate: canEstimate,
                isEstimating: _estimating,
                onGenerateEstimate: _generateEstimate,
              ),
              const SizedBox(height: 20),

              // ── Linked Hazard Card ────────────────────────────────────────
              if (wo.hazardId != null || wo.hazardTicket != null) ...[
                _buildLinkedHazardCard(wo),
                const SizedBox(height: 20),
              ],

              // ── Linked Asset Card ─────────────────────────────────────────
              if (wo.assetId != null || wo.assetName != null) ...[
                _buildLinkedAssetCard(wo),
                const SizedBox(height: 20),
              ],

              // ── Notes & Audit Metadata ────────────────────────────────────
              _buildAuditCard(wo, fmt),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildApprovalBanner(WorkOrder wo, bool canApproveOrReject) {
    final isApproved = wo.isApproved;
    final isRejected = wo.isRejected;
    final isPending = wo.isApprovalPending;
    final isNotRequired = !wo.approvalRequired &&
        wo.approvalStatus.toUpperCase() == 'NOT_REQUIRED';

    final Color bannerColor = isApproved
        ? Colors.green.shade50
        : isRejected
            ? Colors.red.shade50
            : isPending
                ? Colors.amber.shade50
                : Colors.blueGrey.shade50;

    final Color borderColor = isApproved
        ? Colors.green.shade300
        : isRejected
            ? Colors.red.shade300
            : isPending
                ? Colors.amber.shade300
                : Colors.blueGrey.shade200;

    final Color textColor = isApproved
        ? Colors.green.shade900
        : isRejected
            ? Colors.red.shade900
            : isPending
                ? Colors.amber.shade900
                : Colors.blueGrey.shade800;

    final IconData icon = isApproved
        ? Icons.check_circle_outline
        : isRejected
            ? Icons.cancel_outlined
            : isPending
                ? Icons.gavel_outlined
                : Icons.verified_outlined;

    final String statusTitle = isApproved
        ? 'Director Approval: Approved'
        : isRejected
            ? 'Director Approval: Rejected'
            : isPending
                ? 'Director Approval: Pending'
                : 'Director Approval: Not Required';

    final String badgeLabel = isApproved
        ? 'Authorized'
        : isRejected
            ? 'Not Authorized'
            : isPending
                ? 'Awaiting Sign-off'
                : 'Standard Order';

    String reasonText;
    if (isNotRequired) {
      reasonText =
          'Standard maintenance order within municipal operating thresholds. Does not require Public Works Director sign-off.';
    } else {
      switch (wo.approvalReason) {
        case 'Both':
          reasonText =
              'Estimated repair cost exceeds the configured municipal approval threshold and the site is on a high-risk arterial road or traffic corridor.';
          break;
        case 'ArterialRoadRisk':
          reasonText =
              'Site is located on a high-risk arterial road or traffic corridor.';
          break;
        case 'ThresholdExceeded':
          reasonText =
              'Estimated repair cost exceeds the configured municipal approval threshold.';
          break;
        default:
          reasonText =
              'Formal Public Works Director authorization is required.';
      }
    }

    String? auditNote;
    if ((isApproved || isRejected) && wo.notes != null) {
      final lines = wo.notes!.split('\n');
      for (final line in lines.reversed) {
        if (line.contains('[APPROVED') || line.contains('[REJECTED')) {
          auditNote = line.trim();
          break;
        }
      }
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bannerColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: textColor, size: 22),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          statusTitle,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: textColor,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isApproved
                                ? Colors.green.shade100
                                : isRejected
                                    ? Colors.red.shade100
                                    : isPending
                                        ? Colors.amber.shade200
                                        : Colors.blueGrey.shade100,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            badgeLabel,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: textColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      reasonText,
                      style: TextStyle(
                          fontSize: 12, color: textColor, height: 1.3),
                    ),
                    if (auditNote != null) ...[
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white70,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          auditNote,
                          style: TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 11,
                            color: textColor,
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 4),
                    Text(
                      'Human Public Works Director sign-off is required. AI estimates costs but cannot approve work orders.',
                      style: TextStyle(
                        fontSize: 10,
                        fontStyle: FontStyle.italic,
                        color: textColor.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (canApproveOrReject) ...[
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),
            if (_submittingApproval)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 10),
                      Text(
                        'Submitting director decision...',
                        style: TextStyle(fontSize: 12),
                      ),
                    ],
                  ),
                ),
              )
            else
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _confirmApprove,
                      icon: const Icon(Icons.check_circle_outline, size: 16),
                      label: const Text('Approve Work Order'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green.shade700,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _confirmReject,
                      icon: const Icon(Icons.cancel_outlined, size: 16),
                      label: const Text('Reject Work Order'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red.shade700,
                        side: BorderSide(color: Colors.red.shade300),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildFinancialCard(WorkOrder wo, NumberFormat currencyFmt) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.account_balance_wallet_outlined,
                    size: 18, color: Color(0xFF1A6FA8)),
                SizedBox(width: 8),
                Text(
                  'Financial Summary',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _FinancialTile(
                    label: 'Estimated Cost',
                    amount: wo.estimatedCost != null
                        ? currencyFmt.format(wo.estimatedCost)
                        : '—',
                    color: Colors.green.shade700,
                  ),
                ),
                Expanded(
                  child: _FinancialTile(
                    label: 'Approved Budget',
                    amount: wo.approvedBudget != null
                        ? currencyFmt.format(wo.approvedBudget)
                        : '—',
                    color: Colors.blue.shade700,
                  ),
                ),
                Expanded(
                  child: _FinancialTile(
                    label: 'Actual Cost',
                    amount: wo.actualCost != null
                        ? currencyFmt.format(wo.actualCost)
                        : '—',
                    color: Colors.grey.shade800,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOperationalCard(WorkOrder wo, DateFormat fmt) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.engineering_outlined,
                    size: 18, color: Color(0xFF1A6FA8)),
                SizedBox(width: 8),
                Text(
                  'Operational & Crew Assignment',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _DetailItem(
              icon: Icons.schedule,
              label: 'Estimated Duration',
              value: wo.estimatedDurationHours != null
                  ? '${wo.estimatedDurationHours} hours'
                  : 'Not specified',
            ),
            _DetailItem(
              icon: Icons.groups_outlined,
              label: 'Recommended Crew Size',
              value: wo.recommendedCrewSize != null
                  ? '${wo.recommendedCrewSize} workers'
                  : 'Not specified',
            ),
            _DetailItem(
              icon: Icons.badge_outlined,
              label: 'Assigned Crew / Worker',
              value: wo.assignedCrew != null && wo.assignedCrew!.isNotEmpty
                  ? wo.assignedCrew!
                  : 'Unassigned',
            ),
            if (wo.assignedContractorName != null)
              _DetailItem(
                icon: Icons.business_outlined,
                label: 'Contractor',
                value: wo.assignedContractorName!,
              ),
            _DetailItem(
              icon: Icons.event_outlined,
              label: 'Scheduled Date',
              value: wo.scheduledDate != null
                  ? fmt.format(wo.scheduledDate!.toLocal())
                  : 'Not scheduled yet',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLinkedHazardCard(WorkOrder wo) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.report_problem_outlined,
                    size: 18, color: Color(0xFFF4A426)),
                SizedBox(width: 8),
                Text(
                  'Originating Citizen Hazard (Member 1)',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (wo.hazardTicket != null)
              _DetailItem(
                icon: Icons.confirmation_number_outlined,
                label: 'Ticket Number',
                value: wo.hazardTicket!,
              ),
            if (wo.hazardCategory != null)
              _DetailItem(
                icon: Icons.category_outlined,
                label: 'Category',
                value: wo.hazardCategory!,
              ),
            if (wo.hazardSeverity != null)
              _DetailItem(
                icon: Icons.speed_outlined,
                label: 'Severity',
                value: wo.hazardSeverity!,
              ),
            if (wo.hazardAddress != null)
              _DetailItem(
                icon: Icons.place_outlined,
                label: 'Location Address',
                value: wo.hazardAddress!,
              ),
            if (wo.hazardDescription != null &&
                wo.hazardDescription!.isNotEmpty)
              _DetailItem(
                icon: Icons.notes_outlined,
                label: 'Hazard Notes',
                value: wo.hazardDescription!,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLinkedAssetCard(WorkOrder wo) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.apartment_outlined,
                    size: 18, color: Color(0xFF1A6FA8)),
                SizedBox(width: 8),
                Text(
                  'Infrastructure Asset (Member 2)',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (wo.assetId != null)
              _DetailItem(
                icon: Icons.qr_code_outlined,
                label: 'Asset ID',
                value: wo.assetId!,
              ),
            if (wo.assetName != null)
              _DetailItem(
                icon: Icons.domain_outlined,
                label: 'Asset Name',
                value: wo.assetName!,
              ),
            if (wo.assetType != null)
              _DetailItem(
                icon: Icons.category_outlined,
                label: 'Asset Type',
                value: wo.assetType!,
              ),
            if (wo.assetCondition != null)
              _DetailItem(
                icon: Icons.health_and_safety_outlined,
                label: 'Condition',
                value: wo.assetCondition!,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAuditCard(WorkOrder wo, DateFormat fmt) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Audit Trail & Notes',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 10),
            _DetailItem(
              icon: Icons.person_outline,
              label: 'Created By',
              value: wo.createdBy.isNotEmpty ? wo.createdBy : 'System',
            ),
            _DetailItem(
              icon: Icons.schedule_outlined,
              label: 'Created At',
              value: fmt.format(wo.createdAt.toLocal()),
            ),
            _DetailItem(
              icon: Icons.update_outlined,
              label: 'Last Updated',
              value: fmt.format(wo.updatedAt.toLocal()),
            ),
            if (wo.notes != null && wo.notes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text(
                'Notes & History:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Text(
                  wo.notes!,
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: Colors.grey.shade800,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _FinancialTile extends StatelessWidget {
  final String label;
  final String amount;
  final Color color;

  const _FinancialTile({
    required this.label,
    required this.amount,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.grey),
        ),
        const SizedBox(height: 4),
        Text(
          amount,
          style: TextStyle(
            fontFamily: 'monospace',
            fontWeight: FontWeight.bold,
            fontSize: 13,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _DetailItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _DetailItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: Colors.grey.shade500),
          const SizedBox(width: 8),
          SizedBox(
            width: 140,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade600,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
        ],
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
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
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
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        priority.toUpperCase(),
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: 11,
        ),
      ),
    );
  }
}

class _ArterialRoadBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.red.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red.shade200),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.warning_amber_rounded,
              size: 13, color: Colors.red.shade700),
          const SizedBox(width: 3),
          Text(
            'Arterial Road',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: Colors.red.shade700,
            ),
          ),
        ],
      ),
    );
  }
}
