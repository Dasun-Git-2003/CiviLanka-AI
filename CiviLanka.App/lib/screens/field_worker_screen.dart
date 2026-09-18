import 'package:flutter/material.dart';

class FieldWorkerScreen extends StatefulWidget {
  const FieldWorkerScreen({super.key});

  @override
  State<FieldWorkerScreen> createState() => _FieldWorkerScreenState();
}

class _FieldWorkerScreenState extends State<FieldWorkerScreen> {
  // Mock assigned work order for Member 4 Field Worker mode
  String _status = 'ASSIGNED';
  String? _beforePhoto = 'https://images.unsplash.com/photo-1542013936693-884638332954?w=600&auto=format&fit=crop&q=80';
  String? _afterPhoto = 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600&auto=format&fit=crop&q=80';
  final List<String> _materials = ['Thermal fuse 16A', 'Insulation tape'];
  final TextEditingController _materialCtrl = TextEditingController();
  final TextEditingController _notesCtrl = TextEditingController(text: 'Repairs concluded. Cones deployed.');
  bool _isProcessing = false;

  void _startWork() {
    setState(() => _status = 'IN_PROGRESS');
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Work initiated. Safety protocol active.')),
    );
  }

  void _completeJob() {
    setState(() => _isProcessing = true);
    Future.delayed(const Duration(milliseconds: 600), () {
      setState(() {
        _status = 'VERIFIED';
        _isProcessing = false;
      });

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Row(
            children: [
              Icon(Icons.check_circle, color: Colors.green),
              SizedBox(width: 8),
              Text('Audit Result: PASS'),
            ],
          ),
          content: const Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Municipal Safety & Audit Agent verified repair. GPS offset 12m (<=50m tolerance). Before/After photographic evidence valid.',
                style: TextStyle(fontSize: 13),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('OK'),
            )
          ],
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Field Worker Execution Mode'),
        backgroundColor: const Color(0xFF10B981),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.between,
                      children: [
                        const Text(
                          'WO #104 (Streetlight Fault)',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                        Chip(
                          label: Text(_status, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          backgroundColor: Colors.teal.shade50,
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text('Exposed wiring and blown thermal fuse on lighting pole #L-114.'),
                    const SizedBox(height: 8),
                    const Row(
                      children: [
                        Icon(Icons.location_on, size: 16, color: Colors.red),
                        SizedBox(width: 4),
                        Text('Park Road, Colombo 05 (Coords: 6.8856, 79.8654)', style: TextStyle(fontSize: 12)),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),
            if (_status == 'ASSIGNED')
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _startWork,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Start Work (Set IN_PROGRESS)'),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
                ),
              ),

            const SizedBox(height: 16),
            const Text('Photo Evidence (Before & After)', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: Container(
                    height: 100,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: _beforePhoto != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(_beforePhoto!, fit: BoxFit.cover),
                          )
                        : const Center(child: Icon(Icons.camera_alt)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    height: 100,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: _afterPhoto != null
                        ? ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(_afterPhoto!, fit: BoxFit.cover),
                          )
                        : const Center(child: Icon(Icons.camera_alt)),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),
            const Text('Materials Consumed', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              children: _materials.map((m) => Chip(label: Text(m, style: const TextStyle(fontSize: 11)))).toList(),
            ),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _materialCtrl,
                    decoration: const InputDecoration(hintText: 'Add material...'),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.add_circle, color: Color(0xFF10B981)),
                  onPressed: () {
                    if (_materialCtrl.text.isNotEmpty) {
                      setState(() {
                        _materials.add(_materialCtrl.text.trim());
                        _materialCtrl.clear();
                      });
                    }
                  },
                ),
              ],
            ),

            const SizedBox(height: 16),
            const Text('Completion Notes & Safety Protocol', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            TextField(
              controller: _notesCtrl,
              maxLines: 2,
              decoration: const InputDecoration(border: OutlineInputBorder()),
            ),

            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isProcessing ? null : _completeJob,
                icon: const Icon(Icons.verified),
                label: Text(_isProcessing ? 'Auditing...' : 'Complete Job & Run AI Safety Audit'),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
