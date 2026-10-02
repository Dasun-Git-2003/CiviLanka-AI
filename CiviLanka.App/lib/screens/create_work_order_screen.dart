import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/work_order.dart';
import '../services/work_order_service.dart';

class CreateWorkOrderScreen extends StatefulWidget {
  final String? initialHazardId;
  final String? initialAssetId;

  const CreateWorkOrderScreen({
    super.key,
    this.initialHazardId,
    this.initialAssetId,
  });

  @override
  State<CreateWorkOrderScreen> createState() => _CreateWorkOrderScreenState();
}

class _CreateWorkOrderScreenState extends State<CreateWorkOrderScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _costCtrl = TextEditingController();

  String _selectedPriority = 'NORMAL';
  String? _selectedHazardId;
  String? _selectedAssetId;

  List<HazardOption> _availableHazards = [];
  List<AssetOption> _availableAssets = [];
  bool _loadingOptions = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _selectedHazardId = widget.initialHazardId;
    _selectedAssetId = widget.initialAssetId;
    _loadOptions();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _costCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadOptions() async {
    setState(() => _loadingOptions = true);
    try {
      final service = context.read<WorkOrderService>();
      final hazards = await service.getAvailableHazards();
      final assets = await service.getAvailableAssets();
      if (mounted) {
        setState(() {
          _availableHazards = hazards;
          _availableAssets = assets;
          _loadingOptions = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _loadingOptions = false);
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_submitting) return;

    setState(() => _submitting = true);

    try {
      double? estimatedCost;
      final costText = _costCtrl.text.trim();
      if (costText.isNotEmpty) {
        estimatedCost = double.tryParse(costText.replaceAll(',', ''));
      }

      final input = CreateWorkOrderInput(
        title: _titleCtrl.text.trim(),
        description: _descCtrl.text.trim(),
        priority: _selectedPriority,
        estimatedCost: estimatedCost,
        hazardId: _selectedHazardId,
        assetId: _selectedAssetId,
      );

      final created =
          await context.read<WorkOrderService>().createWorkOrder(input);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Work Order ${created.workOrderNumber} created successfully!'),
            backgroundColor: Colors.green.shade700,
          ),
        );
        Navigator.pop(context, created);
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
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Work Order'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header note ───────────────────────────────────────────────
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                      color: theme.colorScheme.primary.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline,
                        color: theme.colorScheme.primary, size: 20),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Text(
                        'New work orders will automatically be evaluated for arterial road risk and director approval threshold.',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // ── Title ─────────────────────────────────────────────────────
              TextFormField(
                controller: _titleCtrl,
                enabled: !_submitting,
                decoration: const InputDecoration(
                  labelText: 'Title *',
                  hintText: 'e.g. Emergency Pothole Repair on Baseline Rd',
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
                  hintText:
                      'Provide detailed scope of work, damages, and site notes...',
                  alignLabelWithHint: true,
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Description is required';
                  }
                  if (v.trim().length < 10) {
                    return 'Description must be at least 10 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // ── Priority Dropdown ─────────────────────────────────────────
              DropdownButtonFormField<String>(
                value: _selectedPriority,
                decoration: const InputDecoration(
                  labelText: 'Priority *',
                  prefixIcon: Icon(Icons.flag_outlined),
                ),
                items: const [
                  DropdownMenuItem(value: 'LOW', child: Text('LOW')),
                  DropdownMenuItem(value: 'NORMAL', child: Text('NORMAL')),
                  DropdownMenuItem(value: 'HIGH', child: Text('HIGH')),
                  DropdownMenuItem(value: 'URGENT', child: Text('URGENT')),
                ],
                onChanged: _submitting
                    ? null
                    : (val) {
                        if (val != null) {
                          setState(() => _selectedPriority = val);
                        }
                      },
              ),
              const SizedBox(height: 16),

              // ── Estimated Cost ────────────────────────────────────────────
              TextFormField(
                controller: _costCtrl,
                enabled: !_submitting,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Estimated Cost (LKR)',
                  hintText: 'e.g. 85000',
                  prefixIcon: Icon(Icons.payments_outlined),
                  helperText:
                      'Orders exceeding the municipal threshold will require Public Works Director approval',
                ),
                validator: (v) {
                  if (v != null && v.trim().isNotEmpty) {
                    final num = double.tryParse(v.trim().replaceAll(',', ''));
                    if (num == null || num < 0) {
                      return 'Enter a valid positive amount';
                    }
                  }
                  return null;
                },
              ),
              const SizedBox(height: 20),

              const Divider(),
              const SizedBox(height: 12),

              // ── Optional Linking Section ──────────────────────────────────
              Text(
                'Linked Entities (Optional)',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text(
                'Link to an existing citizen hazard report or municipal infrastructure asset.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
              const SizedBox(height: 14),

              // ── Citizen Hazard Selector ───────────────────────────────────
              if (_loadingOptions)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 10),
                      Text('Loading active hazards...',
                          style: TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                )
              else
                DropdownButtonFormField<String?>(
                  value: _selectedHazardId,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Linked Citizen Hazard',
                    prefixIcon: Icon(Icons.report_problem_outlined),
                  ),
                  items: [
                    const DropdownMenuItem<String?>(
                      value: null,
                      child: Text('None (Standalone Work Order)'),
                    ),
                    ..._availableHazards.map(
                      (h) => DropdownMenuItem<String?>(
                        value: h.id,
                        child: Text(
                          '${h.ticketNumber} — ${h.category}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                  onChanged: _submitting
                      ? null
                      : (val) => setState(() => _selectedHazardId = val),
                ),
              const SizedBox(height: 16),

              // ── Infrastructure Asset Selector ─────────────────────────────
              if (_loadingOptions)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      SizedBox(width: 10),
                      Text('Loading infrastructure assets...',
                          style: TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                )
              else
                DropdownButtonFormField<String?>(
                  value: _selectedAssetId,
                  isExpanded: true,
                  decoration: const InputDecoration(
                    labelText: 'Linked Infrastructure Asset',
                    prefixIcon: Icon(Icons.domain_outlined),
                  ),
                  items: [
                    const DropdownMenuItem<String?>(
                      value: null,
                      child: Text('None (General Repair)'),
                    ),
                    ..._availableAssets.map(
                      (a) => DropdownMenuItem<String?>(
                        value: a.id,
                        child: Text(
                          '${a.id} — ${a.name}',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                  onChanged: _submitting
                      ? null
                      : (val) => setState(() => _selectedAssetId = val),
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
                      : const Icon(Icons.check),
                  label: Text(_submitting
                      ? 'Creating Work Order...'
                      : 'Create Work Order'),
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
