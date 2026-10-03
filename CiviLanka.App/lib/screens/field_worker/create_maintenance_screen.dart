import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/work_order.dart';
import '../../services/maintenance_service.dart';
import '../../services/work_order_service.dart';
import '../../theme/app_colors.dart';

class CreateMaintenanceScreen extends StatefulWidget {
  final String? initialWorkOrderId;

  const CreateMaintenanceScreen({super.key, this.initialWorkOrderId});

  @override
  State<CreateMaintenanceScreen> createState() => _CreateMaintenanceScreenState();
}

class _CreateMaintenanceScreenState extends State<CreateMaintenanceScreen> {
  final _formKey = GlobalKey<FormState>();

  String? _selectedWorkOrderId;
  String _maintenanceType = 'Corrective';
  final _descriptionCtrl = TextEditingController();
  final _materialsCtrl = TextEditingController();
  final _equipmentCtrl = TextEditingController();
  final _labourHoursCtrl = TextEditingController(text: '4.0');
  final _actualCostCtrl = TextEditingController(text: '15000');
  final _workerNotesCtrl = TextEditingController();

  List<WorkOrder> _workOrders = [];
  bool _isLoadingWos = true;
  bool _isSubmitting = false;
  String? _errorMessage;

  final List<String> _maintenanceTypes = [
    'Corrective',
    'Preventive',
    'Emergency',
    'Routine',
    'Inspection',
  ];

  final Map<String, String> _typeDescriptions = {
    'Corrective': 'Fix damage or rectify operational fault',
    'Preventive': 'Scheduled service to prevent asset breakdown',
    'Emergency': 'Immediate intervention for severe hazard',
    'Routine': 'Standard periodic upkeep and cleaning',
    'Inspection': 'Diagnostic testing and structural survey',
  };

  final List<String> _standardMaterials = [
    'Cold Mix Asphalt (50kg)',
    'Bitumen Emulsion Tack Coat',
    'PVC Pipe Couplings & Seals',
    'Aggregate Base Grade 1',
    'Electrical Conduit & Cable',
    'Hydraulic Rapid Cement',
  ];

  final List<String> _standardEquipment = [
    'Vibratory Plate Compactor',
    'Mini Hydraulic Excavator',
    'Boom Lift / Aerial Bucket',
    'Pneumatic Jackhammer',
    'Reflective Cones & Signage',
  ];

  final List<String> _safetyProtocols = [
    'Mandatory PPE Verified (Helmets, High-Vis Vests, Steel-Toe Boots)',
    'Work Zone Barricading & Traffic Control Signage Deployed',
    'Underground Utility Line Clearance / Electrical Isolation Verified',
    'First Aid Equipment & Emergency Contacts on Active Standby',
    'Environmental & Weather Hazard Assessment Completed',
  ];

  final Set<String> _selectedProtocols = {
    'Mandatory PPE Verified (Helmets, High-Vis Vests, Steel-Toe Boots)',
    'Work Zone Barricading & Traffic Control Signage Deployed',
  };

  @override
  void initState() {
    super.initState();
    _selectedWorkOrderId = widget.initialWorkOrderId;
    _fetchWorkOrders();
  }

  Future<void> _fetchWorkOrders() async {
    try {
      final wos = await context.read<WorkOrderService>().getAllWorkOrders();
      if (mounted) {
        setState(() {
          _workOrders = wos;
          if (_selectedWorkOrderId == null && wos.isNotEmpty) {
            _selectedWorkOrderId = wos.first.id;
          }
          _isLoadingWos = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingWos = false);
      }
    }
  }

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    _materialsCtrl.dispose();
    _equipmentCtrl.dispose();
    _labourHoursCtrl.dispose();
    _actualCostCtrl.dispose();
    _workerNotesCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitRecord() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedWorkOrderId == null || _selectedWorkOrderId!.isEmpty) {
      setState(() => _errorMessage = 'Please select an associated work order.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      final hours = double.tryParse(_labourHoursCtrl.text.trim()) ?? 0.0;
      final cost = double.tryParse(_actualCostCtrl.text.trim()) ?? 0.0;

      final payload = {
        'workOrderId': _selectedWorkOrderId,
        'maintenanceType': _maintenanceType,
        'description': _descriptionCtrl.text.trim(),
        'materialsUsed': _materialsCtrl.text.trim(),
        'equipmentUsed': _equipmentCtrl.text.trim(),
        'labourHours': hours,
        'actualCost': cost,
        'safetyChecklist': _selectedProtocols.join(' | '),
        'workerNotes': _workerNotesCtrl.text.trim(),
      };

      await context.read<MaintenanceService>().createRecord(payload);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Maintenance record created successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isSubmitting = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('New Maintenance Record'),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppColors.critical.withValues(alpha: 0.1),
                    border: Border.all(color: AppColors.critical.withValues(alpha: 0.3)),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AppColors.critical, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: AppColors.critical, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AppColors.slate200),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.assignment, color: AppColors.primary, size: 18),
                          SizedBox(width: 8),
                          Text(
                            'Target Work Order',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (_isLoadingWos)
                        const LinearProgressIndicator()
                      else if (_workOrders.isEmpty)
                        TextFormField(
                          initialValue: _selectedWorkOrderId,
                          decoration: const InputDecoration(
                            labelText: 'Work Order ID / UUID',
                            hintText: 'e.g. 00000000-0000-0000-0000-000000000000',
                            prefixIcon: Icon(Icons.tag),
                          ),
                          onChanged: (val) => _selectedWorkOrderId = val.trim(),
                          validator: (val) =>
                              (val == null || val.isEmpty) ? 'Required' : null,
                        )
                      else
                        DropdownButtonFormField<String>(
                          initialValue: _workOrders.any((w) => w.id == _selectedWorkOrderId)
                              ? _selectedWorkOrderId
                              : null,
                          isExpanded: true,
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                          hint: const Text('Select active work order...'),
                          items: _workOrders.map((wo) {
                            return DropdownMenuItem<String>(
                              value: wo.id,
                              child: Text(
                                '${wo.orderNumber} - ${wo.title}',
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13),
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            setState(() => _selectedWorkOrderId = val);
                          },
                          validator: (val) => val == null ? 'Please select a work order' : null,
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AppColors.slate200),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Maintenance Classification',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _maintenanceTypes.map((type) {
                          final isSelected = _maintenanceType == type;
                          return ChoiceChip(
                            label: Text(type),
                            selected: isSelected,
                            selectedColor: AppColors.primary,
                            labelStyle: TextStyle(
                              color: isSelected ? Colors.white : AppColors.textDark,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            ),
                            onSelected: (selected) {
                              if (selected) setState(() => _maintenanceType = type);
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _typeDescriptions[_maintenanceType] ?? '',
                        style: const TextStyle(fontSize: 12, color: AppColors.slate500, fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AppColors.slate200),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Intervention Details',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _descriptionCtrl,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: 'Operational Description *',
                          hintText: 'Describe repair actions and site conditions...',
                        ),
                        validator: (val) =>
                            (val == null || val.trim().isEmpty) ? 'Please enter a description' : null,
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _labourHoursCtrl,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                labelText: 'Labour Hours *',
                                suffixText: 'hrs',
                              ),
                              validator: (val) =>
                                  (val == null || val.trim().isEmpty) ? 'Required' : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _actualCostCtrl,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                labelText: 'Actual Cost *',
                                prefixText: 'Rs. ',
                              ),
                              validator: (val) =>
                                  (val == null || val.trim().isEmpty) ? 'Required' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _materialsCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Materials Applied',
                          hintText: 'Tap below pills to append materials',
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: _standardMaterials.map((mat) {
                          return ActionChip(
                            label: Text(mat, style: const TextStyle(fontSize: 11)),
                            backgroundColor: AppColors.slate100,
                            onPressed: () {
                              final cur = _materialsCtrl.text;
                              _materialsCtrl.text = cur.isEmpty ? mat : '$cur, $mat';
                            },
                          );
                        }).toList(),
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _equipmentCtrl,
                        decoration: const InputDecoration(
                          labelText: 'Machinery & Equipment Deployed',
                          hintText: 'Tap below pills to append equipment',
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: _standardEquipment.map((eq) {
                          return ActionChip(
                            label: Text(eq, style: const TextStyle(fontSize: 11)),
                            backgroundColor: AppColors.slate100,
                            onPressed: () {
                              final cur = _equipmentCtrl.text;
                              _equipmentCtrl.text = cur.isEmpty ? eq : '$cur, $eq';
                            },
                          );
                        }).toList(),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AppColors.slate200),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.security, color: AppColors.teal, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Municipal Safety Compliance Checklist',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      ..._safetyProtocols.map((protocol) {
                        final isChecked = _selectedProtocols.contains(protocol);
                        return CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          title: Text(protocol, style: const TextStyle(fontSize: 12)),
                          value: isChecked,
                          activeColor: AppColors.teal,
                          onChanged: (val) {
                            setState(() {
                              if (val == true) {
                                _selectedProtocols.add(protocol);
                              } else {
                                _selectedProtocols.remove(protocol);
                              }
                            });
                          },
                        );
                      }),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submitRecord,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.teal,
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.cloud_upload_outlined, color: Colors.white),
                          SizedBox(width: 8),
                          Text(
                            'Submit Field Log to Municipal Audit',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ],
                      ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
