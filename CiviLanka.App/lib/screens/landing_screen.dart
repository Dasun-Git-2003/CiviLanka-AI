import 'package:flutter/material.dart';
import 'welcome_screen.dart';

/// LandingScreen aliases directly to the updated hero-focused [WelcomeScreen].
class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const WelcomeScreen();
  }
}
