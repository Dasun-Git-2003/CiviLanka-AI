import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/work_order.dart';
import '../services/work_order_service.dart';

class EditWorkOrderScreen extends StatefulWidget {
  final WorkOrder workOrder;

  const EditWorkOrderScreen({super.key, required this.workOrder});

  @override
  State<EditWorkOrderScreen> createState() => _EditWorkOrderScreenState();
}

class _EditWorkOrderScreenState extends State<EditWorkOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleCtrl;
  late final TextEditingController _descCtrl;
  late final TextEditingController _assignedCrewCtrl;
  late final TextEditingController _costCtrl;
  late final TextEditingController _budgetCtrl;
  late final TextEditingController _actualCostCtrl;
  late final TextEditingController _notesCtrl;

  late String _selectedPriority;
  late String _selectedStatus;
  DateTime? _selectedDate;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    final wo = widget.workOrder;
    _titleCtrl = TextEditingController(text: wo.title);
    _descCtrl = TextEditingController(text: wo.description);
    _assignedCrewCtrl = TextEditingController(text: wo.assignedCrew ?? '');
    _costCtrl = TextEditingController(
      text:
          wo.estimatedCost != null ? wo.estimatedCost!.toStringAsFixed(0) : '',
    );
    _budgetCtrl = TextEditingController(
      text: wo.approvedBudget != null
          ? wo.approvedBudget!.toStringAsFixed(0)
          : '',
    );
    _actualCostCtrl = TextEditingController(
      text: wo.actualCost != null ? wo.actualCost!.toStringAsFixed(0) : '',
    );
    _notesCtrl = TextEditingController(text: wo.notes ?? '');

    _selectedPriority = wo.priority.toUpperCase();
    _selectedStatus = wo.status.toUpperCase();
    _selectedDate = wo.scheduledDate;
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _assignedCrewCtrl.dispose();
    _costCtrl.dispose();
    _budgetCtrl.dispose();
    _actualCostCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? now,
      firstDate: now.subtract(const Duration(days: 30)),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_submitting) return;

    setState(() => _submitting = true);

    try {
      double? estimatedCost;
      if (_costCtrl.text.trim().isNotEmpty) {
        estimatedCost =
            double.tryParse(_costCtrl.text.trim().replaceAll(',', ''));
      }

      double? approvedBudget;
      if (_budgetCtrl.text.trim().isNotEmpty) {
        approvedBudget =
            double.tryParse(_budgetCtrl.text.trim().replaceAll(',', ''));
      }

      double? actualCost;
      if (_actualCostCtrl.text.trim().isNotEmpty) {
        actualCost =
            double.tryParse(_actualCostCtrl.text.trim().replaceAll(',', ''));
      }

      final input = UpdateWorkOrderInput(
        title: _titleCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        priority: _selectedPriority,
        assignedCrew: _assignedCrewCtrl.text.trim().isNotEmpty
            ? _assignedCrewCtrl.text.trim()
            : null,
        scheduledDate: _selectedDate,
        estimatedCost: estimatedCost,
        approvedBudget: approvedBudget,
        actualCost: actualCost,
        status:
            _selectedStatus != widget.workOrder.status ? _selectedStatus : null,
        notes:
            _notesCtrl.text.trim().isNotEmpty ? _notesCtrl.text.trim() : null,
      );

      final updated = await context
          .read<WorkOrderService>()
          .updateWorkOrder(widget.workOrder.id, input);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Work Order ${updated.workOrderNumber} updated successfully!'),
            backgroundColor: Colors.green.shade700,
          ),
        );
        Navigator.pop(context, updated);
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
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy');
    final statusOptions = {
      _selectedStatus,
      ...WorkOrderStatusConstants.selectableForUpdate,
    }.toList();

    return Scaffold(
      appBar: AppBar(
        title: Text('Edit ${widget.workOrder.workOrderNumber}'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Title ─────────────────────────────────────────────────────
              TextFormField(
                controller: _titleCtrl,
                enabled: !_submitting,
                decoration: const InputDecoration(
                  labelText: 'Title *',
                  prefixIcon: Icon(Icons.title),
                ),
                maxLength: 200,
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Title is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // ── Description ───────────────────────────────────────────────
              TextFormField(
                controller: _descCtrl,
                enabled: !_submitting,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Description *',
                  alignLabelWithHint: true,
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Description is required';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // ── Priority & Status Row ─────────────────────────────────────
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedPriority,
                      decoration: const InputDecoration(
                        labelText: 'Priority *',
                        prefixIcon: Icon(Icons.flag_outlined),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'LOW', child: Text('LOW')),
                        DropdownMenuItem(
                            value: 'NORMAL', child: Text('NORMAL')),
                        DropdownMenuItem(value: 'HIGH', child: Text('HIGH')),
                        DropdownMenuItem(
                            value: 'URGENT', child: Text('URGENT')),
                      ],
                      onChanged: _submitting
                          ? null
                          : (val) {
                              if (val != null) {
                                setState(() => _selectedPriority = val);
                              }
                            },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      value: _selectedStatus,
                      decoration: const InputDecoration(
                        labelText: 'Status',
                        prefixIcon: Icon(Icons.swap_horiz),
                      ),
                      items: statusOptions.map((s) {
                        return DropdownMenuItem(
                          value: s,
                          child: Text(
                            s.replaceAll('_', ' '),
                            style: const TextStyle(fontSize: 12),
                          ),
                        );
                      }).toList(),
                      onChanged: _submitting
                          ? null
                          : (val) {
                              if (val != null) {
                                setState(() => _selectedStatus = val);
                              }
                            },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // ── Crew & Schedule ───────────────────────────────────────────
              TextFormField(
                controller: _assignedCrewCtrl,
                enabled: !_submitting,
                decoration: const InputDecoration(
                  labelText: 'Assigned Crew / Worker',
                  hintText: 'e.g. Roads Unit 3 or worker@civilanka.gov.lk',
                  prefixIcon: Icon(Icons.badge_outlined),
                ),
              ),
              const SizedBox(height: 16),

              // ── Scheduled Date Picker ─────────────────────────────────────
              InkWell(
                onTap: _submitting ? null : _pickDate,
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Scheduled Date',
                    prefixIcon: Icon(Icons.calendar_today_outlined),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _selectedDate != null
                            ? dateFormat.format(_selectedDate!)
                            : 'No date scheduled',
                        style: TextStyle(
                          color: _selectedDate != null
                              ? Colors.black
                              : Colors.grey.shade600,
                        ),
                      ),
                      if (_selectedDate != null)
                        IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          onPressed: _submitting
                              ? null
                              : () => setState(() => _selectedDate = null),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              const Divider(),
              const SizedBox(height: 12),

              // ── Financial Updates ─────────────────────────────────────────
              const Text(
                'Financial Adjustments',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _costCtrl,
                      enabled: !_submitting,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Estimated (Rs)',
                        prefixIcon: Icon(Icons.payments_outlined),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _budgetCtrl,
                      enabled: !_submitting,
                      keyboardType:
                          const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Approved (Rs)',
                        prefixIcon: Icon(Icons.account_balance_outlined),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _actualCostCtrl,
                enabled: !_submitting,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Actual Incurred Cost (Rs)',
                  prefixIcon: Icon(Icons.receipt_long_outlined),
                ),
              ),
              const SizedBox(height: 20),

              // ── Notes ─────────────────────────────────────────────────────
              TextFormField(
                controller: _notesCtrl,
                enabled: !_submitting,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Internal Notes / Audit Log',
                  hintText:
                      'Add instructions, reasons for adjustment, or site remarks...',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 32),

              // ── Submit Button ─────────────────────────────────────────────
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _submitting ? null : _submit,
                  icon: _submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.save_outlined),
                  label:
                      Text(_submitting ? 'Saving Changes...' : 'Save Changes'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
