// CiviLanka.App/lib/screens/director_approvals_screen.dart
// Member 4: Public Works Director Statutory Approvals & Municipal Budget KPIs

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/work_order.dart';
import '../services/work_order_service.dart';

class DirectorApprovalsScreen extends StatefulWidget {
  const DirectorApprovalsScreen({super.key});

  @override
  State<DirectorApprovalsScreen> createState() => _DirectorApprovalsScreenState();
}

class _DirectorApprovalsScreenState extends State<DirectorApprovalsScreen> {
  List<WorkOrder> _pendingOrders = [];
  Map<String, dynamic>? _budgetSummary;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final service = context.read<WorkOrderService>();

    final allOrders = await service.getWorkOrders();
    final budget = await service.getBudgetSummary();

    if (!mounted) return;
    setState(() {
      // Filter for orders requiring human approval: PENDING_APPROVAL or AI_PROPOSED exceeding threshold
      _pendingOrders = allOrders.where((o) {
        return o.status == 'PENDING_APPROVAL' ||
            (o.status == 'AI_PROPOSED' && (o.estimatedCost > 1000 || o.isArterialRoad));
      }).toList();
      _budgetSummary = budget;
      _isLoading = false;
    });
  }

  Future<void> _approveOrder(WorkOrder order) async {
    final TextEditingController amountCtrl =
        TextEditingController(text: order.estimatedCost.toStringAsFixed(0));
    final TextEditingController notesCtrl = TextEditingController(
        text: 'Authorized after executive review under statutory municipal policy.');

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.gavel, color: Color(0xFF1A6FA8)),
            const SizedBox(width: 8),
            Text('Approve WO #${order.id}', style: const TextStyle(fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(order.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 6),
            Text('Road: ${order.roadName}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 12),
            const Text('Approved Amount (LKR):',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            TextField(
              controller: amountCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                prefixText: 'LKR ',
                contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              ),
            ),
            const SizedBox(height: 10),
            const Text('Authorization Notes:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            TextField(
              controller: notesCtrl,
              maxLines: 2,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.all(8),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            child: const Text('Confirm Sign-Off', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final service = context.read<WorkOrderService>();
      final approvedAmount = double.tryParse(amountCtrl.text) ?? order.estimatedCost;
      final success = await service.directorApprove(
        id: order.id,
        approvedAmount: approvedAmount,
        notes: notesCtrl.text,
      );

      if (!mounted) return;
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Work Order #${order.id} approved for LKR ${approvedAmount.toStringAsFixed(0)}'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
        _loadData();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Director Statutory Approvals'),
        backgroundColor: const Color(0xFF1E293B),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Budget Summary Card
                    if (_budgetSummary != null) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.account_balance, color: Colors.amber, size: 20),
                                SizedBox(width: 8),
                                Text(
                                  'Municipal Operational Budget',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _buildBudgetMetric(
                                  'Allocated',
                                  'LKR ${((_budgetSummary!['totalAllocated'] as num?) ?? 141000).toStringAsFixed(0)}',
                                  Colors.white70,
                                ),
                                _buildBudgetMetric(
                                  'Spent',
                                  'LKR ${((_budgetSummary!['totalActualSpent'] as num?) ?? 59200).toStringAsFixed(0)}',
                                  Colors.amberAccent,
                                ),
                                _buildBudgetMetric(
                                  'Remaining',
                                  'LKR ${((_budgetSummary!['remainingBudget'] as num?) ?? 81800).toStringAsFixed(0)}',
                                  const Color(0xFF10B981),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        const Text(
                          'Statutory Approval Queue',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        Chip(
                          label: Text('${_pendingOrders.length} Pending'),
                          backgroundColor: Colors.amber.shade100,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    if (_pendingOrders.isEmpty)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.all(32),
                          child: Text('No orders currently pending statutory approval.',
                              style: TextStyle(color: Colors.grey)),
                        ),
                      )
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _pendingOrders.length,
                        itemBuilder: (ctx, i) {
                          final o = _pendingOrders[i];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.between,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          'WO #${o.id}: ${o.title}',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.orange.shade50,
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(color: Colors.orange.shade200),
                                        ),
                                        child: Text(o.priority,
                                            style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.orange.shade900)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(o.description,
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      const Icon(Icons.location_on, size: 14, color: Colors.red),
                                      const SizedBox(width: 4),
                                      Expanded(
                                        child: Text(o.roadName,
                                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
                                      ),
                                      Text(
                                        'Est: LKR ${o.estimatedCost.toStringAsFixed(0)}',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  SizedBox(
                                    width: double.infinity,
                                    child: ElevatedButton.icon(
                                      onPressed: () => _approveOrder(o),
                                      icon: const Icon(Icons.check, size: 16),
                                      label: const Text('Authorize & Dispatch'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF10B981),
                                        foregroundColor: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildBudgetMetric(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 11)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
