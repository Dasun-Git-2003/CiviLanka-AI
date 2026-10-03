import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/work_order.dart';
import '../services/work_order_service.dart';
import '../services/contractor_service.dart';
import '../models/contractor.dart';
import '../theme/app_colors.dart';

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
  final _crewSizeCtrl = TextEditingController(text: '2');
  final _durationCtrl = TextEditingController(text: '4');

  String _selectedPriority = 'NORMAL';
  String? _selectedHazardId;
  String? _selectedAssetId;
  String _selectedCrew = 'worker@civilanka.gov.lk';
  DateTime _scheduledDate = DateTime.now().add(const Duration(days: 2));

  List<HazardOption> _availableHazards = [];
  List<AssetOption> _availableAssets = [];
  List<Contractor> _availableContractors = [];

  bool _loadingOptions = true;
  bool _submitting = false;
  bool _estimating = false;

  CostEstimatePreviewResponse? _customEstimate;

  final currencyFmt = NumberFormat.currency(symbol: 'Rs. ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _selectedHazardId = widget.initialHazardId;
    _selectedAssetId = widget.initialAssetId;
    _loadAllOptions();
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _costCtrl.dispose();
    _crewSizeCtrl.dispose();
    _durationCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadAllOptions() async {
    setState(() => _loadingOptions = true);
    try {
      final woService = context.read<WorkOrderService>();
      final contractorService = context.read<ContractorService>();

      final results = await Future.wait([
        woService.getAvailableHazards(),
        woService.getAvailableAssets(),
        contractorService.getContractors().catchError((_) => <Contractor>[]),
      ]);

      if (mounted) {
        setState(() {
          _availableHazards = results[0] as List<HazardOption>;
          _availableAssets = results[1] as List<AssetOption>;
          _availableContractors = results[2] as List<Contractor>;
          _loadingOptions = false;
        });

        if (_selectedHazardId != null) {
          _onHazardSelected(_selectedHazardId);
        }
      }
    } catch (_) {
      if (mounted) setState(() => _loadingOptions = false);
    }
  }

  void _onHazardSelected(String? hazardId) {
    setState(() {
      _selectedHazardId = hazardId;
      if (hazardId == null || hazardId.isEmpty) return;

      final matched = _availableHazards.firstWhere(
        (h) => h.id == hazardId,
        orElse: () => const HazardOption(id: '', ticketNumber: '', category: '', description: ''),
      );

      if (matched.id.isNotEmpty) {
        _titleCtrl.text = 'Repair: ${matched.category} - ${matched.ticketNumber.isNotEmpty ? matched.ticketNumber : "Citizen Report"}';
        _descCtrl.text = matched.description;
        if (matched.priority.isNotEmpty) {
          final p = matched.priority.toUpperCase();
          if (['LOW', 'NORMAL', 'HIGH', 'URGENT'].contains(p)) {
            _selectedPriority = p;
          }
        }
        if (_selectedPriority == 'URGENT' || _selectedPriority == 'HIGH') {
          _crewSizeCtrl.text = '4';
          _durationCtrl.text = '6';
        }
      }
    });
  }

  Future<void> _handleEstimateAI() async {
    if (_titleCtrl.text.trim().isEmpty && _descCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a title or scope description for AI estimation.')),
      );
      return;
    }

    setState(() => _estimating = true);
    try {
      final woService = context.read<WorkOrderService>();
      final hazard = _selectedHazard;
      final estimate = await woService.previewEstimate(
        hazardId: _selectedHazardId,
        assetId: _selectedAssetId,
        category: hazard?.category ?? 'Infrastructure Repair',
        description: _descCtrl.text.trim().isNotEmpty ? _descCtrl.text.trim() : _titleCtrl.text.trim(),
        priority: _selectedPriority,
      );

      if (mounted) {
        setState(() {
          _customEstimate = estimate;
          _costCtrl.text = estimate.estimatedCost.toStringAsFixed(0);
          _crewSizeCtrl.text = estimate.recommendedCrewSize.toString();
          _durationCtrl.text = estimate.estimatedDurationHours.toStringAsFixed(0);
          _estimating = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('AI Cost Estimate: ${currencyFmt.format(estimate.estimatedCost)} generated!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _estimating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('AI estimation failed: $e'), backgroundColor: AppColors.critical),
        );
      }
    }
  }

  HazardOption? get _selectedHazard {
    if (_selectedHazardId == null || _selectedHazardId!.isEmpty) return null;
    try {
      return _availableHazards.firstWhere((h) => h.id == _selectedHazardId);
    } catch (_) {
      return null;
    }
  }

  AssetOption? get _selectedAsset {
    if (_selectedAssetId == null || _selectedAssetId!.isEmpty) return null;
    try {
      return _availableAssets.firstWhere((a) => a.id == _selectedAssetId);
    } catch (_) {
      return null;
    }
  }

  bool get _isDirectorApprovalRequired {
    final costVal = double.tryParse(_costCtrl.text.replaceAll(',', '')) ?? 0.0;
    return costVal > 100000 || _selectedPriority == 'URGENT';
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
        hazardId: _selectedHazardId,
        assetId: _selectedAssetId,
        assignedCrew: _selectedCrew,
        scheduledDate: _scheduledDate,
        estimatedCost: estimatedCost,
        materialCost: _customEstimate?.materialCost,
        labourCost: _customEstimate?.labourCost,
        equipmentCost: _customEstimate?.equipmentCost,
        estimatedDurationHours: double.tryParse(_durationCtrl.text.trim()),
        recommendedCrewSize: int.tryParse(_crewSizeCtrl.text.trim()),
        estimateReason: _customEstimate?.reason,
        items: _customEstimate?.items.map((i) => i.toJson()).toList(),
      );

      final created = await context.read<WorkOrderService>().createWorkOrder(input);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Work Order ${created.workOrderNumber} created successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context, created);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppColors.critical,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('Create Municipal Work Order', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.slate900,
        foregroundColor: Colors.white,
      ),
      body: _loadingOptions
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header Subtitle Banner
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.slate200),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 2)),
                        ],
                      ),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Icon(Icons.assignment_outlined, color: AppColors.primary, size: 22),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Authorized Maintenance Order',
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Transform reported citizen hazards into formal dispatch orders with AI cost modeling.',
                                  style: TextStyle(fontSize: 12, color: AppColors.slate600),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ══════════════════════════════════════════════════════════
                    // SECTION 1: ORIGINATING LINKAGES
                    // ══════════════════════════════════════════════════════════
                    _buildSectionCard(
                      stepNumber: '1',
                      title: 'Originating Source & Asset Associations',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Citizen Hazard Selector
                          const Text('Originating Citizen Hazard', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<String?>(
                            value: _selectedHazardId,
                            isExpanded: true,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                              prefixIcon: const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 20),
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('Standalone Maintenance (No Citizen Report)', style: TextStyle(fontSize: 13, color: AppColors.slate600)),
                              ),
                              ..._availableHazards.map(
                                (h) => DropdownMenuItem<String?>(
                                  value: h.id,
                                  child: Text(
                                    '[${h.ticketNumber.isNotEmpty ? h.ticketNumber : "TICKET"}] ${h.category} - ${h.address ?? h.description}',
                                    style: const TextStyle(fontSize: 13, color: AppColors.slate900),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                            ],
                            onChanged: _onHazardSelected,
                          ),

                          // Selected Hazard Preview Card
                          if (_selectedHazard != null) ...[
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7).withOpacity(0.6),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFFCD34D)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '[${_selectedHazard!.ticketNumber}] ${_selectedHazard!.category}',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF78350F)),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFDE68A),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          _selectedHazard!.priority.isNotEmpty ? _selectedHazard!.priority : 'NORMAL',
                                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (_selectedHazard!.address != null) ...[
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        const Icon(Icons.location_on, size: 14, color: Color(0xFFB45309)),
                                        const SizedBox(width: 4),
                                        Expanded(
                                          child: Text(
                                            _selectedHazard!.address!,
                                            style: const TextStyle(fontSize: 12, color: Color(0xFFB45309)),
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],

                          const SizedBox(height: 16),

                          // Infrastructure Asset Selector
                          const Text('Target Infrastructure Asset (Optional)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<String?>(
                            value: _selectedAssetId,
                            isExpanded: true,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                              prefixIcon: const Icon(Icons.domain, color: AppColors.teal, size: 20),
                            ),
                            items: [
                              const DropdownMenuItem<String?>(
                                value: null,
                                child: Text('No Specific Asset Linked', style: TextStyle(fontSize: 13, color: AppColors.slate600)),
                              ),
                              ..._availableAssets.map(
                                (a) => DropdownMenuItem<String?>(
                                  value: a.id,
                                  child: Text(
                                    '[${a.id}] ${a.name} (${a.type} - ${a.location})',
                                    style: const TextStyle(fontSize: 13, color: AppColors.slate900),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ),
                            ],
                            onChanged: (val) => setState(() => _selectedAssetId = val),
                          ),

                          // Selected Asset Preview Card
                          if (_selectedAsset != null) ...[
                            const SizedBox(height: 10),
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFBFDBFE)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.account_balance, size: 20, color: Color(0xFF1D4ED8)),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${_selectedAsset!.name} (${_selectedAsset!.type})',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E3A8A)),
                                        ),
                                        Text(
                                          _selectedAsset!.location,
                                          style: const TextStyle(fontSize: 12, color: Color(0xFF2563EB)),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFDBEAFE),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      'Condition: ${_selectedAsset!.condition}',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E40AF)),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ══════════════════════════════════════════════════════════
                    // SECTION 2: WORK ORDER SPECIFICATIONS
                    // ══════════════════════════════════════════════════════════
                    _buildSectionCard(
                      stepNumber: '2',
                      title: 'Work Order Specifications',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Work Order Title *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _titleCtrl,
                            enabled: !_submitting,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900),
                            decoration: InputDecoration(
                              hintText: 'e.g. Structural repair of damaged culvert on Galle Road',
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                            ),
                            validator: (v) => v == null || v.trim().isEmpty ? 'Title is required' : null,
                          ),

                          const SizedBox(height: 16),

                          const Text('Detailed Scope of Work & Execution Instructions *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _descCtrl,
                            enabled: !_submitting,
                            maxLines: 3,
                            style: const TextStyle(fontSize: 13, color: AppColors.slate800),
                            decoration: InputDecoration(
                              hintText: 'Specify excavation requirements, technical remediation method, concrete grades, and citizen safety isolation...',
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.all(14),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                            ),
                            validator: (v) {
                              if (v == null || v.trim().isEmpty) return 'Description is required';
                              if (v.trim().length < 10) return 'Must be at least 10 characters';
                              return null;
                            },
                          ),

                          const SizedBox(height: 16),

                          const Text('Repair Priority Level', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              _buildPriorityPill('LOW', 'Low', AppColors.slate500, AppColors.slate100),
                              const SizedBox(width: 8),
                              _buildPriorityPill('NORMAL', 'Normal', AppColors.primary, const Color(0xFFDBEAFE)),
                              const SizedBox(width: 8),
                              _buildPriorityPill('HIGH', 'High', AppColors.warning, const Color(0xFFFEF3C7)),
                              const SizedBox(width: 8),
                              _buildPriorityPill('URGENT', 'Urgent', AppColors.critical, const Color(0xFFFEE2E2)),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ══════════════════════════════════════════════════════════
                    // SECTION 3: CREW ALLOCATION & SCHEDULE
                    // ══════════════════════════════════════════════════════════
                    _buildSectionCard(
                      stepNumber: '3',
                      title: 'Crew Allocation & Schedule',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Assigned Crew or Contractor', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
                          const SizedBox(height: 6),
                          DropdownButtonFormField<String>(
                            value: _selectedCrew,
                            isExpanded: true,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                              prefixIcon: const Icon(Icons.people_outline, color: AppColors.teal, size: 20),
                            ),
                            items: [
                              const DropdownMenuItem(
                                value: 'worker@civilanka.gov.lk',
                                child: Text('Default Field Worker (worker@civilanka.gov.lk)', style: TextStyle(fontSize: 13)),
                              ),
                              const DropdownMenuItem(
                                value: 'Colombo Central Rapid Response Crew',
                                child: Text('Colombo Central Rapid Response Crew', style: TextStyle(fontSize: 13)),
                              ),
                              const DropdownMenuItem(
                                value: 'North District Road Maintenance Team',
                                child: Text('North District Road Maintenance Team', style: TextStyle(fontSize: 13)),
                              ),
                              const DropdownMenuItem(
                                value: 'South Drainage & Civil Works Crew',
                                child: Text('South Drainage & Civil Works Crew', style: TextStyle(fontSize: 13)),
                              ),
                              ..._availableContractors.map(
                                (c) => DropdownMenuItem(
                                  value: '${c.name} (${c.email ?? c.phone})',
                                  child: Text('${c.name} — ${c.specialization}', style: const TextStyle(fontSize: 13)),
                                ),
                              ),
                            ],
                            onChanged: (val) {
                              if (val != null) setState(() => _selectedCrew = val);
                            },
                          ),

                          const SizedBox(height: 16),

                          // Scheduled Execution Date
                          const Text('Scheduled Execution Date', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
                          const SizedBox(height: 6),
                          InkWell(
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: _scheduledDate,
                                firstDate: DateTime.now(),
                                lastDate: DateTime.now().add(const Duration(days: 365)),
                              );
                              if (picked != null) {
                                setState(() => _scheduledDate = picked);
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.slate200),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.calendar_today_outlined, size: 18, color: AppColors.slate500),
                                  const SizedBox(width: 10),
                                  Text(
                                    DateFormat('EEEE, MMMM d, yyyy').format(_scheduledDate),
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900),
                                  ),
                                  const Spacer(),
                                  const Text('Change', style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Crew Size & Duration Inputs
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Crew Size', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
                                    const SizedBox(height: 6),
                                    TextFormField(
                                      controller: _crewSizeCtrl,
                                      keyboardType: TextInputType.number,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: Colors.white,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Est. Hours', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
                                    const SizedBox(height: 6),
                                    TextFormField(
                                      controller: _durationCtrl,
                                      keyboardType: TextInputType.number,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      decoration: InputDecoration(
                                        filled: true,
                                        fillColor: Colors.white,
                                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // ══════════════════════════════════════════════════════════
                    // SECTION 4: FINANCIAL BUDGET & AI MATERIALS ESTIMATION
                    // ══════════════════════════════════════════════════════════
                    _buildSectionCard(
                      stepNumber: '4',
                      title: 'Financial Budget & AI Materials Estimation',
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // AI Estimator Trigger Button
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: _estimating ? null : _handleEstimateAI,
                              icon: _estimating
                                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
                              label: Text(
                                _estimating ? 'Calculating with AI...' : 'Estimate & Customize with AI',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                              ),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF4F46E5),
                                padding: const EdgeInsets.symmetric(vertical: 13),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                elevation: 1,
                              ),
                            ),
                          ),

                          const SizedBox(height: 16),

                          const Text('Estimated Work Order Budget (LKR)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700)),
                          const SizedBox(height: 6),
                          TextFormField(
                            controller: _costCtrl,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
                            decoration: InputDecoration(
                              prefixText: 'Rs. ',
                              prefixStyle: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.slate600, fontSize: 14),
                              hintText: 'e.g. 50000 or click AI Estimate above',
                              filled: true,
                              fillColor: Colors.white,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.slate200)),
                            ),
                            onChanged: (_) => setState(() {}),
                          ),

                          const SizedBox(height: 10),

                          // Quick Municipal Budget Presets
                          const Text('Quick Municipal Budget Presets:', style: TextStyle(fontSize: 11, color: AppColors.slate500)),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: [25000, 50000, 75000, 100000, 150000].map((amt) {
                              return ActionChip(
                                label: Text(currencyFmt.format(amt)),
                                labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate700),
                                backgroundColor: Colors.white,
                                side: const BorderSide(color: AppColors.slate200),
                                onPressed: () {
                                  setState(() {
                                    _costCtrl.text = amt.toString();
                                  });
                                },
                              );
                            }).toList(),
                          ),

                          // Custom AI Estimate Breakdown Card
                          if (_customEstimate != null) ...[
                            const SizedBox(height: 16),
                            Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: const Color(0xFFECFDF5),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: const Color(0xFFA7F3D0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      const Row(
                                        children: [
                                          Icon(Icons.check_circle, size: 18, color: Color(0xFF059669)),
                                          SizedBox(width: 6),
                                          Text('AI Estimate Breakdown', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF065F46))),
                                        ],
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.close, size: 18, color: Color(0xFF059669)),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                        onPressed: () => setState(() => _customEstimate = null),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    'Materials: ${currencyFmt.format(_customEstimate!.materialCost)}  •  Labour: ${currencyFmt.format(_customEstimate!.labourCost)}  •  Equipment: ${currencyFmt.format(_customEstimate!.equipmentCost)}',
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF047857)),
                                  ),
                                  if (_customEstimate!.items.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      '${_customEstimate!.items.length} BOQ items verified against Sri Lanka CIDA/BSR standard municipal rates.',
                                      style: const TextStyle(fontSize: 11, color: Color(0xFF065F46)),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],

                          const SizedBox(height: 16),

                          // Dynamic Director Approval Notice
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: _isDirectorApprovalRequired ? const Color(0xFFFEF3C7) : AppColors.slate100,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _isDirectorApprovalRequired ? const Color(0xFFFCD34D) : AppColors.slate200,
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  _isDirectorApprovalRequired ? Icons.shield_outlined : Icons.info_outline,
                                  size: 18,
                                  color: _isDirectorApprovalRequired ? const Color(0xFFB45309) : AppColors.slate600,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    _isDirectorApprovalRequired
                                        ? 'Director Approval Mandatory: This order exceeds Rs. 100,000 threshold or is marked URGENT. It will require Public Works Director approval before execution.'
                                        : 'Standard Supervisory Flow: Orders under Rs. 100,000 can be assigned and dispatched directly by Field Maintenance Supervisors.',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: _isDirectorApprovalRequired ? FontWeight.w600 : FontWeight.normal,
                                      color: _isDirectorApprovalRequired ? const Color(0xFF78350F) : AppColors.slate700,
                                      height: 1.3,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 28),

                    // Submit & Cancel Buttons
                    Row(
                      children: [
                        Expanded(
                          flex: 1,
                          child: OutlinedButton(
                            onPressed: _submitting ? null : () => Navigator.pop(context),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              side: const BorderSide(color: AppColors.slate300),
                            ),
                            child: const Text('Cancel', style: TextStyle(color: AppColors.slate700, fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          flex: 2,
                          child: ElevatedButton.icon(
                            onPressed: _submitting ? null : _submit,
                            icon: _submitting
                                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : const Icon(Icons.add_task, color: Colors.white, size: 20),
                            label: Text(
                              _submitting
                                  ? 'Creating Order...'
                                  : _customEstimate != null
                                      ? 'Create with AI Estimate'
                                      : 'Create Work Order',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFD97706),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                              elevation: 2,
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSectionCard({
    required String stepNumber,
    required String title,
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.slate200),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  stepNumber,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFB45309)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.slate100),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _buildPriorityPill(String id, String label, Color color, Color bgColor) {
    final isSelected = _selectedPriority == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedPriority = id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? color : bgColor.withOpacity(0.5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? color : color.withOpacity(0.3),
              width: isSelected ? 2 : 1,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: isSelected ? Colors.white : color,
            ),
          ),
        ),
      ),
    );
  }
}
