import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../theme/app_colors.dart';

/// Interactive modal dialog allowing users to switch between
/// Hosted Cloud (Azure) and Localhost (USB / Wi-Fi / Emulator) backends.
class ServerConfigDialog extends StatefulWidget {
  const ServerConfigDialog({super.key});

  static Future<void> show(BuildContext context) {
    return showDialog(
      context: context,
      barrierDismissible: true,
      builder: (_) => const ServerConfigDialog(),
    );
  }

  @override
  State<ServerConfigDialog> createState() => _ServerConfigDialogState();
}

class _ServerConfigDialogState extends State<ServerConfigDialog> {
  late TextEditingController _urlController;
  bool _isTesting = false;
  bool? _testResult;
  int? _latencyMs;
  String _testMessage = '';

  @override
  void initState() {
    super.initState();
    final api = context.read<ApiService>();
    _urlController = TextEditingController(text: api.baseUrl);
    _runPingTest(api.baseUrl);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _runPingTest(String url) async {
    setState(() {
      _isTesting = true;
      _testResult = null;
      _testMessage = 'Pinging backend health endpoint...';
    });

    final api = context.read<ApiService>();
    final stopwatch = Stopwatch()..start();
    final isOk = await api.checkHealth(url.trim());
    stopwatch.stop();

    if (mounted) {
      setState(() {
        _isTesting = false;
        _testResult = isOk;
        _latencyMs = stopwatch.elapsedMilliseconds;
        _testMessage = isOk
            ? 'Connected! HTTP 200 OK (${_latencyMs} ms)'
            : 'Connection failed. Verify server is running and accessible.';
      });
    }
  }

  void _selectPreset(String presetUrl) {
    setState(() {
      _urlController.text = presetUrl;
    });
    _runPingTest(presetUrl);
  }

  Future<void> _saveAndApply() async {
    final newUrl = _urlController.text.trim();
    if (newUrl.isEmpty) return;

    final api = context.read<ApiService>();
    await api.setBaseUrl(newUrl);

    if (mounted) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Connected to ${api.serverDisplayName}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          backgroundColor: const Color(0xFF10B981),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final api = context.watch<ApiService>();
    final currentUrl = _urlController.text.trim();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: isDark ? const Color(0xFF0F172A) : Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 540),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(22),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Header ──────────────────────────────────────────────────
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.dns_rounded, color: Color(0xFFF59E0B), size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Backend Server Settings',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : AppColors.textDark,
                          ),
                        ),
                        Text(
                          'Switch between Azure Cloud and Local Development',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(Icons.close_rounded, color: isDark ? Colors.grey[400] : Colors.grey[600]),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // ── Live Status Card ─────────────────────────────────────────
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: _testResult == true
                        ? const Color(0xFF10B981).withValues(alpha: 0.5)
                        : _testResult == false
                            ? const Color(0xFFEF4444).withValues(alpha: 0.5)
                            : isDark
                                ? const Color(0xFF334155)
                                : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  children: [
                    if (_isTesting)
                      const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2.2, color: Color(0xFFF59E0B)),
                      )
                    else
                      Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _testResult == true
                              ? const Color(0xFF10B981)
                              : _testResult == false
                                  ? const Color(0xFFEF4444)
                                  : Colors.grey,
                          boxShadow: _testResult == true
                              ? [
                                  BoxShadow(
                                    color: const Color(0xFF10B981).withValues(alpha: 0.5),
                                    blurRadius: 6,
                                  )
                                ]
                              : null,
                        ),
                      ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Active Backend: ${api.serverDisplayName}',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white70 : Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            _testMessage.isEmpty ? 'Ready to test' : _testMessage,
                            style: TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: _testResult == true
                                  ? const Color(0xFF10B981)
                                  : _testResult == false
                                      ? const Color(0xFFEF4444)
                                      : isDark
                                          ? Colors.grey[300]
                                          : Colors.grey[700],
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      tooltip: 'Ping Now',
                      onPressed: () => _runPingTest(_urlController.text),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ── Quick Presets ───────────────────────────────────────────
              Text(
                'QUICK PRESETS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 8),

              // 1. Hosted Azure Cloud Preset
              _buildPresetTile(
                title: 'Hosted Cloud (Azure)',
                subtitle: 'Live Production API • Accessible Anywhere',
                url: ApiService.prodUrl,
                isSelected: currentUrl == ApiService.prodUrl,
                icon: Icons.cloud_done_rounded,
                badge: 'ONLINE',
                badgeColor: const Color(0xFF10B981),
                isDark: isDark,
              ),
              const SizedBox(height: 8),

              // 2. Local PC via USB (adb reverse)
              _buildPresetTile(
                title: 'Local PC (USB localhost:5000)',
                subtitle: 'adb reverse tcp:5000 tcp:5000 • Dev Server',
                url: ApiService.localUsbUrl,
                isSelected: currentUrl == ApiService.localUsbUrl,
                icon: Icons.cable_rounded,
                badge: 'LOCAL',
                badgeColor: const Color(0xFF3B82F6),
                isDark: isDark,
              ),
              const SizedBox(height: 8),

              // 3. Local Wi-Fi Network
              _buildPresetTile(
                title: 'Local Wi-Fi Network (LAN)',
                subtitle: 'Direct Wi-Fi IP connection (port 5000)',
                url: ApiService.localWifiUrl,
                isSelected: currentUrl == ApiService.localWifiUrl,
                icon: Icons.wifi_rounded,
                badge: 'LAN',
                badgeColor: const Color(0xFF8B5CF6),
                isDark: isDark,
              ),
              const SizedBox(height: 8),

              // 4. Android Emulator Loopback
              _buildPresetTile(
                title: 'Android Emulator (10.0.2.2:5000)',
                subtitle: 'Standard Android Studio Virtual Device',
                url: ApiService.localEmulatorUrl,
                isSelected: currentUrl == ApiService.localEmulatorUrl,
                icon: Icons.phone_android_rounded,
                badge: 'EMULATOR',
                badgeColor: const Color(0xFFEC4899),
                isDark: isDark,
              ),
              const SizedBox(height: 16),

              // ── Custom URL Input ────────────────────────────────────────
              Text(
                'TARGET API BASE URL',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _urlController,
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 12.5,
                  color: isDark ? Colors.white : AppColors.textDark,
                ),
                decoration: InputDecoration(
                  prefixIcon: const Icon(Icons.link_rounded, size: 20),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.send_rounded, size: 18),
                    tooltip: 'Test this URL',
                    onPressed: () => _runPingTest(_urlController.text),
                  ),
                  hintText: 'https://...',
                  filled: true,
                  fillColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onSubmitted: (val) => _runPingTest(val),
              ),
              const SizedBox(height: 20),

              // ── Action Buttons ──────────────────────────────────────────
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _saveAndApply,
                      icon: const Icon(Icons.check_rounded, size: 18),
                      label: const Text('Apply Server', style: TextStyle(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF59E0B),
                        foregroundColor: const Color(0xFF0F172A),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPresetTile({
    required String title,
    required String subtitle,
    required String url,
    required bool isSelected,
    required IconData icon,
    required String badge,
    required Color badgeColor,
    required bool isDark,
  }) {
    return InkWell(
      onTap: () => _selectPreset(url),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? const Color(0xFF1E293B) : const Color(0xFFFEF3C7))
              : (isDark ? const Color(0xFF1E293B).withValues(alpha: 0.4) : Colors.white),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? const Color(0xFFF59E0B)
                : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            width: isSelected ? 1.8 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: badgeColor.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: badgeColor, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : AppColors.textDark,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: badgeColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          badge,
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: badgeColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 10.5,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle_rounded, color: Color(0xFFF59E0B), size: 20)
            else
              Icon(Icons.chevron_right_rounded, color: isDark ? Colors.grey[600] : Colors.grey[400], size: 20),
          ],
        ),
      ),
    );
  }
}
