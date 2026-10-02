import 'dart:async';
import 'package:flutter/material.dart';
import '../main.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;
  int _loadingStep = 0;

  final List<String> _loadingMessagesEn = [
    'Initializing CivitaGuard AI...',
    'Connecting to CiviLanka Network...',
    'Loading Municipal GIS Telemetry...',
    'Readying Infrastructure Operations...'
  ];

  final List<String> _loadingMessagesSi = [
    'CivitaGuard AI පද්ධතිය සක්‍රිය වෙමින් පවතී...',
    'CiviLanka ජාලයට සම්බන්ධ වෙමින් පවතී...',
    'නාගරික GIS දත්ත පද්ධතිය පූරණය වෙමින් පවතී...',
    'මෙහෙයුම් පද්ධතිය සූදානම්...'
  ];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _scaleAnimation = Tween<double>(begin: 0.94, end: 1.06).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    _fadeAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );

    // Progress text updates
    Timer.periodic(const Duration(milliseconds: 500), (timer) {
      if (mounted) {
        setState(() {
          _loadingStep = (_loadingStep + 1) % _loadingMessagesEn.length;
        });
      }
    });

    // Navigate to AuthGate after 2.2 seconds
    Future.delayed(const Duration(milliseconds: 2200), () {
      if (mounted) {
        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) => const AuthGate(),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              return FadeTransition(opacity: animation, child: child);
            },
            transitionDuration: const Duration(milliseconds: 600),
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Stack(
        children: [
          // Background Radial Gradient Glow
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment.center,
                  radius: 1.2,
                  colors: [
                    const Color(0xFFF59E0B).withValues(alpha: 0.12),
                    const Color(0xFF0F172A),
                    const Color(0xFF020617),
                  ],
                  stops: const [0.0, 0.6, 1.0],
                ),
              ),
            ),
          ),

          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Animated Glowing Logo Icon (Using Logo.jpg)
                AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    return Transform.scale(
                      scale: _scaleAnimation.value,
                      child: Opacity(
                        opacity: _fadeAnimation.value,
                        child: Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                                blurRadius: 30,
                                spreadRadius: 4,
                              ),
                              BoxShadow(
                                color: const Color(0xFFEA580C).withValues(alpha: 0.3),
                                blurRadius: 50,
                                spreadRadius: 8,
                              ),
                            ],
                          ),
                          child: ClipOval(
                            child: Image.asset(
                              'assets/images/Logo.jpg',
                              fit: BoxFit.cover,
                              errorBuilder: (ctx, err, stack) => Container(
                                color: const Color(0xFFEA580C),
                                child: const Icon(
                                  Icons.shield_rounded,
                                  color: Colors.white,
                                  size: 60,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 28),

                // Brand Name
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'CiviLanka',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEA580C),
                        borderRadius: BorderRadius.circular(8),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFEA580C).withValues(alpha: 0.4),
                            blurRadius: 10,
                          ),
                        ],
                      ),
                      child: const Text(
                        'AI',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),

                // Tagline / Subtitle
                const Text(
                  'MUNICIPAL INFRASTRUCTURE INTELLIGENCE',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1.8,
                  ),
                ),

                const SizedBox(height: 48),

                // Loading Spinner
                const SizedBox(
                  width: 32,
                  height: 32,
                  child: CircularProgressIndicator(
                    strokeWidth: 3,
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFF59E0B)),
                  ),
                ),

                const SizedBox(height: 18),

                // Animated Progress Status Messages
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: Column(
                    key: ValueKey<int>(_loadingStep),
                    children: [
                      Text(
                        _loadingMessagesEn[_loadingStep],
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _loadingMessagesSi[_loadingStep],
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.45),
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Footer Copyright
          Positioned(
            bottom: 24,
            left: 0,
            right: 0,
            child: Text(
              'CivitaGuard AI Intelligence Suite © 2026',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white.withValues(alpha: 0.35),
                fontSize: 10.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
