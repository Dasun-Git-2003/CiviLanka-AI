import 'package:flutter/material.dart';

class ContractorsDirectoryScreen extends StatelessWidget {
  const ContractorsDirectoryScreen({super.key});

  static const List<Map<String, String>> _contractors = [
    {
      'id': 'CON-001',
      'name': 'Lanka Infrastructure Construction (Pvt) Ltd',
      'category': 'Civil & Roads',
      'contact': '+94 11 258 4930',
      'rating': '4.9 ⭐',
      'status': 'Verified CIDA C1 Grade',
      'assignments': '3 Active Work Orders',
    },
    {
      'id': 'CON-002',
      'name': 'Colombo Municipal Water Engineering Corp',
      'category': 'Water & Drainage',
      'contact': '+94 11 492 8100',
      'rating': '4.8 ⭐',
      'status': 'CMC Authorized Partner',
      'assignments': '2 Active Work Orders',
    },
    {
      'id': 'CON-003',
      'name': 'Ceylon Electrical & Streetlight Grid Solutions',
      'category': 'Electrical Power',
      'contact': '+94 77 391 0293',
      'rating': '4.7 ⭐',
      'status': 'CEB Certified Contractor',
      'assignments': '1 Active Work Order',
    },
    {
      'id': 'CON-004',
      'name': 'Southern Asphalt & Paving Engineers',
      'category': 'Road Surfacing',
      'contact': '+94 11 720 1944',
      'rating': '4.6 ⭐',
      'status': 'RDA Registered',
      'assignments': '4 Active Work Orders',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Contractors Directory'),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _contractors.length,
        itemBuilder: (ctx, i) {
          final c = _contractors[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(c['id']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFF97316))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(c['status']!, style: const TextStyle(color: Color(0xFF10B981), fontSize: 10.5, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(c['name']!, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 2),
                Text('${c['category']} • ${c['contact']}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(c['rating']!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    Text(c['assignments']!, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF2563EB))),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
