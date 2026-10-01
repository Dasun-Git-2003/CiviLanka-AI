import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/auth_state.dart';
import 'auth/register_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  bool _isSinhala = false;
  bool _isDarkMode = true;

  void _navigateToLogin() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _LoginModalSheet(isSinhala: _isSinhala),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1D),
      body: Stack(
        children: [
          // â”€â”€ 1. Cinematic Aerial City Background Image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          Positioned.fill(
            child: Image.asset(
              'assets/images/cinematic_aerial_city_hero.jpg',
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0xFF0F172A), Color(0xFF020617)],
                    ),
                  ),
                );
              },
            ),
          ),

          // â”€â”€ 2. Cinematic Dark Vignette & Gradient Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: 0.70),
                    Colors.black.withValues(alpha: 0.50),
                    const Color(0xFF080D1A).withValues(alpha: 0.85),
                    const Color(0xFF060913).withValues(alpha: 0.98),
                  ],
                  stops: const [0.0, 0.35, 0.70, 1.0],
                ),
              ),
            ),
          ),

          // â”€â”€ 3. Foreground Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          SafeArea(
            child: Column(
              children: [
                // â”€â”€ Top Navigation Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    children: [
                      // National / Municipal Emblem
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFF59E0B).withValues(alpha: 0.25),
                              blurRadius: 10,
                              spreadRadius: 1,
                            ),
                          ],
                        ),
                        child: ClipOval(
                          child: Image.asset(
                            'assets/images/Logo.png',
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => const Icon(
                              Icons.shield_rounded,
                              color: Color(0xFFF59E0B),
                              size: 28,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Brand Titles
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text(
                                  'CiviLanka',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEA580C),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    'AI',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 11,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _isSinhala ? 'නාගරික බුද්ධි පද්ධතිය' : 'MUNICIPAL INTELLIGENCE',
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 8.5,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Language Toggle Pill
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _isSinhala = !_isSinhala;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.45),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.white24, width: 1),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.language_rounded,
                                color: Color(0xFFFBBF24),
                                size: 14,
                              ),
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

                      // Theme Toggle Pill
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            _isDarkMode = !_isDarkMode;
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.all(7),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.45),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white24, width: 1),
                          ),
                          child: Icon(
                            _isDarkMode ? Icons.wb_sunny_outlined : Icons.nightlight_round,
                            color: const Color(0xFFFBBF24),
                            size: 15,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const Spacer(),

                // â”€â”€ Hero Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Eyebrow Tagline
                      Text(
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
                      const SizedBox(height: 14),

                      // Big Headline
                      RichText(
                        textAlign: TextAlign.center,
                        text: TextSpan(
                          children: [
                            TextSpan(
                              text: _isSinhala ? 'වඩාත් සුහුරු\nයටිතල පහසුකම්.\n' : 'Smarter\nInfrastructure.\n',
                              style: const TextStyle(
                                fontSize: 36,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                height: 1.15,
                                letterSpacing: -0.8,
                              ),
                            ),
                            TextSpan(
                              text: _isSinhala ? 'සුරක්ෂිත නගර.' : 'Safer Cities.',
                              style: const TextStyle(
                                fontSize: 36,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFFFBBF24),
                                height: 1.15,
                                letterSpacing: -0.8,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 18),

                      // Subtitle / Description
                      Text(
                        _isSinhala
                            ? 'පුරවැසි වාර්තාවල සිට ස්නායු දෝෂ වර්ගීකරණය, පුරෝකථන වත්කම් අවදානම් සහ විනිවිද පෙනෙන මූල්‍ය පාලනය හරහා නඩත්තු ප්‍රතිචාර කඩිනම් කිරීම.'
                            : 'CiviLanka AI accelerates municipal maintenance response from citizen reports to verified repairs with neural defect classification, predictive asset risk, and transparent fiscal governance.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.86),
                          fontSize: 13.5,
                          height: 1.5,
                          fontWeight: FontWeight.w400,
                        ),
                      ),
                      const SizedBox(height: 32),

                      // â”€â”€ Only Login Button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: ElevatedButton(
                          onPressed: _navigateToLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFEA580C),
                            foregroundColor: Colors.white,
                            elevation: 8,
                            shadowColor: const Color(0xFFEA580C).withValues(alpha: 0.5),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.login_rounded, size: 20),
                              const SizedBox(width: 10),
                              Text(
                                _isSinhala ? 'පද්ධතියට පිවිසෙන්න (Login)' : 'Sign In to Portal',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.3,
                                ),
                              ),
                              const SizedBox(width: 8),
                              const Icon(Icons.arrow_forward_rounded, size: 18),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const Spacer(),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// â”€â”€ Interactive Login Modal Bottom Sheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class _LoginModalSheet extends StatefulWidget {
  final bool isSinhala;
  const _LoginModalSheet({required this.isSinhala});

  @override
  State<_LoginModalSheet> createState() => _LoginModalSheetState();
}

class _LoginModalSheetState extends State<_LoginModalSheet> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController(text: 'citizen@test.com');
  final _passwordCtrl = TextEditingController(text: 'Director123!');
  bool _obscurePassword = true;
  bool _loading = false;
  String? _errorMessage;
  int _selectedRoleIndex = 0;

  final List<Map<String, dynamic>> _demoRoles = [
    {
      'role': 'Citizen',
      'email': 'citizen@test.com',
      'password': 'Director123!',
      'icon': Icons.person_outline_rounded,
      'badge': 'CIVILIAN',
      'color': const Color(0xFF38BDF8),
    },
    {
      'role': 'Field Worker',
      'email': 'fieldworker@test.com',
      'password': 'Director123!',
      'icon': Icons.engineering_outlined,
      'badge': 'FIELD OPS',
      'color': const Color(0xFF2DD4BF),
    },
    {
      'role': 'Supervisor',
      'email': 'supervisor@test.com',
      'password': 'Director123!',
      'icon': Icons.supervisor_account_outlined,
      'badge': 'TRIAGE & BOQ',
      'color': const Color(0xFFF59E0B),
    },
    {
      'role': 'Director',
      'email': 'director@test.com',
      'password': 'Director123!',
      'icon': Icons.admin_panel_settings_outlined,
      'badge': 'GOVERNANCE',
      'color': const Color(0xFFEF4444),
    },
  ];

  void _selectRole(int index) {
    setState(() {
      _selectedRoleIndex = index;
      _emailCtrl.text = _demoRoles[index]['email'] as String;
      _passwordCtrl.text = _demoRoles[index]['password'] as String;
      _errorMessage = null;
    });
  }

  Future<void> _submitLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final authService = context.read<AuthService>();
      final authState = context.read<AuthState>();

      await authService.login(
        email: _emailCtrl.text.trim(),
        password: _passwordCtrl.text,
      );

      if (mounted) {
        authState.setLoggedIn(true);
        Navigator.pop(context); // Close bottom sheet
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + bottomInset),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: Color(0xFF334155), width: 1.5),
        ),
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Grab handle
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Title Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.isSinhala ? 'පද්ධතියට පිවිසෙන්න' : 'Sign In to CiviLanka',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        widget.isSinhala
                            ? 'ඔබේ අක්තපත්‍ර ඇතුළත් කරන්න හෝ ඩිමෝ එකක් තෝරන්න'
                            : 'Select a demo persona or enter credentials',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.white60,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close_rounded, color: Colors.white70),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Demo Persona Quick-Fill Chips
              Text(
                widget.isSinhala ? 'ක්ෂණික පිවිසුම් භූමිකාව (Quick Demo):' : 'One-Tap Demo Persona:',
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 8),

              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: List.generate(_demoRoles.length, (i) {
                    final role = _demoRoles[i];
                    final isSelected = _selectedRoleIndex == i;
                    final roleColor = role['color'] as Color;

                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: GestureDetector(
                        onTap: () => _selectRole(i),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? roleColor.withValues(alpha: 0.22)
                                : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected ? roleColor : const Color(0xFF334155),
                              width: isSelected ? 1.5 : 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                role['icon'] as IconData,
                                size: 16,
                                color: isSelected ? roleColor : Colors.white70,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                role['role'] as String,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                  color: isSelected ? Colors.white : Colors.white70,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 18),

              // Error Banner
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444), size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // Email Field
              TextFormField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  labelText: widget.isSinhala ? 'විද්‍යුත් තැපෑල (Email)' : 'Official Email',
                  labelStyle: const TextStyle(color: Colors.white60, fontSize: 12),
                  prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF94A3B8), size: 18),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF334155)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF334155)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFF59E0B)),
                  ),
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Email is required';
                  if (!val.contains('@')) return 'Enter a valid email';
                  return null;
                },
              ),
              const SizedBox(height: 12),

              // Password Field
              TextFormField(
                controller: _passwordCtrl,
                obscureText: _obscurePassword,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  labelText: widget.isSinhala ? 'මුරපදය (Password)' : 'Password',
                  labelStyle: const TextStyle(color: Colors.white60, fontSize: 12),
                  prefixIcon: const Icon(Icons.lock_outline_rounded, color: Color(0xFF94A3B8), size: 18),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                      color: Colors.white60,
                      size: 18,
                    ),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF334155)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF334155)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFFF59E0B)),
                  ),
                ),
                validator: (val) {
                  if (val == null || val.isEmpty) return 'Password is required';
                  return null;
                },
              ),
              const SizedBox(height: 18),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _loading ? null : _submitLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEA580C),
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: const Color(0xFFEA580C).withValues(alpha: 0.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _loading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              widget.isSinhala ? 'පිවිසෙන්න' : 'Authenticate & Sign In',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.arrow_forward_rounded, size: 16),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 12),

              // Citizen Register Link
              Center(
                child: TextButton(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const RegisterScreen()),
                    );
                  },
                  child: Text(
                    widget.isSinhala ? 'නව පුරවැසියෙක්ද? ලියාපදිංචි වන්න' : 'New Citizen? Register an account',
                    style: const TextStyle(
                      color: Color(0xFF38BDF8),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
