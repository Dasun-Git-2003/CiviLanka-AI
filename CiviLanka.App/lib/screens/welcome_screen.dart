import 'package:flutter/material.dart';
import 'auth/login_screen.dart';
import 'citizen/report_hazard_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  bool _isSinhala = false;

  void _navigateToLogin() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  void _navigateToReportHazard() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const ReportHazardScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final isCompact = size.width < 600;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      body: Stack(
        children: [
          // Background Cinematic Hero Image with Dark Gradient Overlay
          Positioned.fill(
            child: Image.asset(
              'assets/images/cinematic_aerial_city_hero.jpg',
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => const ColoredBox(
                color: Color(0xFF0A0F1D),
              ),
            ),
          ),
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Color(0xF20A0F1D), // 95% opacity dark navy at top
                    Color(0xD90A0F1D), // 85% opacity in middle
                    Color(0xFA0A0F1D), // 98% opacity at bottom
                  ],
                ),
              ),
            ),
          ),

          // Main Scrollable Content Area
          SafeArea(
            child: Column(
              children: [
                // ── Top Navigation Bar ──────────────────────────────────────────
                _buildTopBar(),

                // ── Centered Hero Section (matching screenshot exactly) ─────────
                Expanded(
                  child: Center(
                    child: SingleChildScrollView(
                      padding: EdgeInsets.symmetric(
                        horizontal: isCompact ? 24.0 : 48.0,
                        vertical: 24.0,
                      ),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 820),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            // 1. Amber Eyebrow Tagline
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: const Color(0xFFF59E0B).withValues(alpha: 0.3),
                                  width: 1,
                                ),
                              ),
                              child: Text(
                                _isSinhala
                                    ? 'ජාතික නාගරික යටිතල පහසුකම් බුද්ධිමය වේදිකාව'
                                    : 'National Municipal Infrastructure Intelligence Platform',
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Color(0xFFF59E0B),
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.4,
                                ),
                              ),
                            ),
                            const SizedBox(height: 20),

                            // 2. Main Heading: "Smarter Infrastructure. Safer Cities."
                            RichText(
                              textAlign: TextAlign.center,
                              text: TextSpan(
                                children: [
                                  TextSpan(
                                    text: _isSinhala ? 'වඩාත් සුහුරු යටිතල පහසුකම්.\n' : 'Smarter\nInfrastructure.\n',
                                    style: TextStyle(
                                      fontSize: isCompact ? 36 : 52,
                                      fontWeight: FontWeight.w900,
                                      color: Colors.white,
                                      height: 1.15,
                                      letterSpacing: -1.0,
                                    ),
                                  ),
                                  TextSpan(
                                    text: _isSinhala ? 'සුරක්ෂිත නගර.' : 'Safer Cities.',
                                    style: TextStyle(
                                      fontSize: isCompact ? 36 : 52,
                                      fontWeight: FontWeight.w900,
                                      color: const Color(0xFFFBBF24),
                                      height: 1.15,
                                      letterSpacing: -1.0,
                                      shadows: [
                                        Shadow(
                                          color: const Color(0xFFF59E0B).withValues(alpha: 0.5),
                                          blurRadius: 24,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 18),

                            // 3. Subtitle Description
                            Text(
                              _isSinhala
                                  ? 'පුරවැසි වාර්තාවල සිට ස්නායු දෝෂ වර්ගීකරණය, පුරෝකථන වත්කම් අවදානම් සහ විනිවිද පෙනෙන මූල්‍ය පාලනය හරහා නඩත්තු ප්‍රතිචාර කඩිනම් කිරීම.'
                                  : 'CiviLanka AI accelerates municipal maintenance response from citizen reports to verified repairs with neural defect classification, predictive asset risk, and transparent fiscal governance.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.82),
                                fontSize: isCompact ? 14 : 16,
                                height: 1.6,
                                fontWeight: FontWeight.w400,
                              ),
                            ),
                            const SizedBox(height: 36),

                            // 4. Action CTA Buttons (side-by-side or stacked on tiny screens)
                            if (isCompact)
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  _buildReportIssueButton(),
                                  const SizedBox(height: 12),
                                  _buildSignInPortalButton(),
                                ],
                              )
                            else
                              Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  SizedBox(
                                    width: 250,
                                    child: _buildReportIssueButton(),
                                  ),
                                  const SizedBox(width: 16),
                                  SizedBox(
                                    width: 250,
                                    child: _buildSignInPortalButton(),
                                  ),
                                ],
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Top Navigation Bar ───────────────────────────────────────────────────────
  Widget _buildTopBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withValues(alpha: 0.85),
        border: const Border(
          bottom: BorderSide(color: Color(0xFF1E293B), width: 1),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Logo & Brand Name
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.6),
                    width: 1.5,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: ClipOval(
                  child: Image.asset(
                    'assets/images/Logo.png',
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const Icon(
                      Icons.shield,
                      color: Color(0xFFF59E0B),
                      size: 20,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'CiviLanka',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 17,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFEA580C), Color(0xFFD97706)],
                          ),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: const Color(0xFFF59E0B).withValues(alpha: 0.5),
                            width: 0.8,
                          ),
                        ),
                        child: const Text(
                          'AI',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    _isSinhala ? 'නාගරික බුද්ධි පද්ධතිය' : 'MUNICIPAL INTELLIGENCE',
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 8.5,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.0,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Action Items (Language Switcher + Sign In button)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // 🌐 Sinhala / English Switcher
              InkWell(
                onTap: () => setState(() => _isSinhala = !_isSinhala),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.language_rounded, color: Color(0xFFFBBF24), size: 14),
                      const SizedBox(width: 5),
                      Text(
                        _isSinhala ? 'English' : 'සිංහල',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // 🛡️ Sign In Button
              InkWell(
                onTap: _navigateToLogin,
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF475569)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.shield_outlined, size: 14, color: Color(0xFFF59E0B)),
                      const SizedBox(width: 5),
                      Text(
                        _isSinhala ? 'පිවිසෙන්න' : 'Sign In',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Primary Action Button: "Report an Issue →" ──────────────────────────────
  Widget _buildReportIssueButton() {
    return ElevatedButton(
      onPressed: _navigateToReportHazard,
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFFEA580C), // Vibrant municipal orange
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 6,
        shadowColor: const Color(0xFFEA580C).withValues(alpha: 0.4),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.warning_amber_rounded, size: 19),
          const SizedBox(width: 8),
          Text(
            _isSinhala ? 'උපද්‍රවයක් වාර්තා කරන්න' : 'Report an Issue',
            style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w800),
          ),
          const SizedBox(width: 6),
          const Icon(Icons.arrow_forward_rounded, size: 17),
        ],
      ),
    );
  }

  // ── Secondary Action Button: "Sign In to Portal" ─────────────────────────────
  Widget _buildSignInPortalButton() {
    return OutlinedButton(
      onPressed: _navigateToLogin,
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.white,
        backgroundColor: const Color(0xFF1E293B).withValues(alpha: 0.6),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        side: const BorderSide(color: Color(0xFF334155), width: 1.5),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.shield_outlined, size: 19, color: Color(0xFFF59E0B)),
          const SizedBox(width: 8),
          Text(
            _isSinhala ? 'පද්ධතියට පිවිසෙන්න' : 'Sign In to Portal',
            style: const TextStyle(
              fontSize: 14.5,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}
