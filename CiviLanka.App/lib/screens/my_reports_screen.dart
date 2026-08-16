import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/hazard.dart';
import '../services/hazard_service.dart';
import '../widgets/hazard_card.dart';
import 'hazard_details_screen.dart';

class MyReportsScreen extends StatefulWidget {
  const MyReportsScreen({super.key});

  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  List<Hazard> _hazards = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final list = await context.read<HazardService>().getMyHazards();
      if (mounted) setState(() { _hazards = list; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Reports'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
          )
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.error_outline,
                              size: 48, color: Colors.red),
                          const SizedBox(height: 16),
                          Text(_error!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.red)),
                          const SizedBox(height: 16),
                          ElevatedButton(
                              onPressed: _load,
                              child: const Text('Retry')),
                        ],
                      ),
                    ),
                  )
                : _hazards.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 120),
                          Center(
                            child: Column(
                              children: [
                                Icon(Icons.inbox_outlined,
                                    size: 72, color: Colors.grey),
                                SizedBox(height: 16),
                                Text('No hazard reports yet.',
                                    style: TextStyle(
                                        fontSize: 16, color: Colors.grey)),
                                SizedBox(height: 8),
                                Text(
                                  'Tap "+" to report an infrastructure problem.',
                                  style: TextStyle(color: Colors.grey),
                                ),
                              ],
                            ),
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _hazards.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 4),
                        itemBuilder: (ctx, i) {
                          final hazard = _hazards[i];
                          return HazardCard(
                            hazard: hazard,
                            onTap: () => Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => HazardDetailsScreen(
                                  hazardId: hazard.id,
                                ),
                              ),
                            ).then((_) => _load()),
                          );
                        },
                      ),
      ),
    );
  }
}
