import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/auth_state.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  final bool initialSinhala;
  const LoginScreen({super.key, this.initialSinhala = false});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController(text: 'citizen@civilanka.gov.lk');
  final _passwordCtrl = TextEditingController(text: 'Director123!');
  bool _obscurePassword = true;
  bool _rememberMe = true;
  bool _loading = false;
  String? _errorMessage;
  late bool _isSinhala;
  bool _isDarkMode = false;
  int _selectedRoleIndex = 0;

  final List<Map<String, dynamic>> _demoRoles = [
    {
      'role': 'Citizen',
      'email': 'citizen@civilanka.gov.lk',
      'password': 'Director123!',
      'badge': 'CIVILIAN',
      'color': const Color(0xFF0284C7),
    },
    {
      'role': 'Field Worker',
      'email': 'worker@civilanka.gov.lk',
      'password': 'Director123!',
      'badge': 'FIELD OPS',
      'color': const Color(0xFF0D9488),
    },
    {
      'role': 'Supervisor',
      'email': 'supervisor@civilanka.gov.lk',
      'password': 'Director123!',
      'badge': 'TRIAGE & BOQ',
      'color': const Color(0xFFD97706),
    },
    {
      'role': 'Director',
      'email': 'director@civilanka.gov.lk',
      'password': 'Director123!',
      'badge': 'GOVERNANCE',
      'color': const Color(0xFFDC2626),
    },
  ];

  @override
  void initState() {
    super.initState();
    _isSinhala = widget.initialSinhala;
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

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
        Navigator.of(context).popUntil((route) => route.isFirst);
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
    final bgColor = _isDarkMode ? const Color(0xFF0B1120) : Colors.white;
    final cardBgColor = _isDarkMode ? const Color(0xFF1E293B) : Colors.white;
    final titleColor = _isDarkMode ? Colors.white : const Color(0xFF0F172A);
    final subtitleColor = _isDarkMode ? const Color(0xFF94A3B8) : const Color(0xFF64748B);
    final labelColor = _isDarkMode ? const Color(0xFFCBD5E1) : const Color(0xFF334155);
    final inputBg = _isDarkMode ? const Color(0xFF0F172A) : Colors.white;
    final inputBorder = _isDarkMode ? const Color(0xFF334155) : const Color(0xFFCBD5E1);

    return Scaffold(
      backgroundColor: bgColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Top Navigation Bar ─────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  children: [
                    // Back button to Welcome Screen
                    IconButton(
                      icon: Icon(
                        Icons.arrow_back_ios_new_rounded,
                        color: titleColor,
                        size: 20,
                      ),
                      onPressed: () => Navigator.pop(context),
                      tooltip: 'Back to Welcome',
                    ),
                    const Spacer(),

                    // Language Toggle Pill
                    GestureDetector(
                      onTap: () => setState(() => _isSinhala = !_isSinhala),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: _isDarkMode ? const Color(0xFF1E293B) : Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: _isDarkMode ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 4,
                              offset: const Offset(0, 1),
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.language_rounded,
                              color: Color(0xFFEAB308),
                              size: 16,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _isSinhala ? 'English' : 'සිංහල',
                              style: TextStyle(
                                color: titleColor,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),

                    // Theme Toggle Switch (Matches media_1790843951401.png)
                    GestureDetector(
                      onTap: () => setState(() => _isDarkMode = !_isDarkMode),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: 52,
                        height: 30,
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: _isDarkMode ? const Color(0xFF334155) : const Color(0xFFE2D9CF),
                          borderRadius: BorderRadius.circular(15),
                        ),
                        alignment: _isDarkMode ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          width: 24,
                          height: 24,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.white,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black12,
                                blurRadius: 3,
                                offset: Offset(0, 1),
                              ),
                            ],
                          ),
                          child: Center(
                            child: Icon(
                              _isDarkMode ? Icons.nightlight_round : Icons.wb_sunny_outlined,
                              size: 14,
                              color: _isDarkMode ? const Color(0xFFFBBF24) : const Color(0xFF525252),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // ── Center Login Form Card ─────────────────────────────────────
              Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 460),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 28),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Heading: "Welcome Back"
                          Text(
                            _isSinhala ? 'නැවත සාදරයෙන් පිළිගනිමු' : 'Welcome Back',
                            style: TextStyle(
                              fontSize: 34,
                              fontWeight: FontWeight.w900,
                              color: titleColor,
                              letterSpacing: -0.6,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Subtitle: "Sign in to your CivitaGuard AI account."
                          Text(
                            _isSinhala
                                ? 'ඔබගේ CivitaGuard AI ගිණුමට පිවිසෙන්න.'
                                : 'Sign in to your CivitaGuard AI account.',
                            style: TextStyle(
                              fontSize: 15,
                              color: subtitleColor,
                              fontWeight: FontWeight.w400,
                            ),
                          ),
                          const SizedBox(height: 36),

                          // Error Banner
                          if (_errorMessage != null) ...[
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEE2E2),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFF87171)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline_rounded, color: Color(0xFFDC2626), size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 12),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 18),
                          ],

                          // ── EMAIL ADDRESS Label ────────────────────────────
                          Text(
                            _isSinhala ? 'විද්‍යුත් තැපැල් ලිපිනය' : 'EMAIL  ADDRESS',
                            style: TextStyle(
                              color: labelColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 8),

                          // Email Input Field
                          TextFormField(
                            controller: _emailCtrl,
                            keyboardType: TextInputType.emailAddress,
                            style: TextStyle(color: titleColor, fontSize: 14.5),
                            decoration: InputDecoration(
                              hintText: 'name@municipality.gov.lk',
                              hintStyle: TextStyle(
                                color: _isDarkMode ? Colors.white38 : const Color(0xFF94A3B8),
                                fontSize: 14,
                              ),
                              filled: true,
                              fillColor: inputBg,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(color: inputBorder),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(color: inputBorder),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFEA580C), width: 1.6),
                              ),
                            ),
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) return 'Email is required';
                              if (!val.contains('@')) return 'Enter a valid email';
                              return null;
                            },
                          ),
                          const SizedBox(height: 22),

                          // ── PASSWORD Label + Forgot Password Link ──────────
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _isSinhala ? 'මුරපදය' : 'PASSWORD',
                                style: TextStyle(
                                  color: labelColor,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.8,
                                ),
                              ),
                              GestureDetector(
                                onTap: () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        _isSinhala
                                            ? 'කරුණාකර නාගරික පරිපාලක අමතන්න (1990) හෝ පහතින් ඇති Demo තෝරන්න'
                                            : 'Please use demo persona presets below or contact Municipal Admin',
                                      ),
                                    ),
                                  );
                                },
                                child: Text(
                                  _isSinhala ? 'මුරපදය අමතකද?' : 'Forgot password?',
                                  style: const TextStyle(
                                    color: Color(0xFFEA580C),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),

                          // Password Input Field
                          TextFormField(
                            controller: _passwordCtrl,
                            obscureText: _obscurePassword,
                            style: TextStyle(color: titleColor, fontSize: 14.5),
                            decoration: InputDecoration(
                              hintText: '••••••••',
                              hintStyle: TextStyle(
                                color: _isDarkMode ? Colors.white38 : const Color(0xFF94A3B8),
                                fontSize: 14,
                                letterSpacing: 2.0,
                              ),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                                  color: const Color(0xFF94A3B8),
                                  size: 20,
                                ),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                              filled: true,
                              fillColor: inputBg,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(color: inputBorder),
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide(color: inputBorder),
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: const BorderSide(color: Color(0xFFEA580C), width: 1.6),
                              ),
                            ),
                            validator: (val) {
                              if (val == null || val.isEmpty) return 'Password is required';
                              return null;
                            },
                          ),
                          const SizedBox(height: 18),

                          // ── Remember workstation checkbox ──────────────────
                          Row(
                            children: [
                              SizedBox(
                                width: 22,
                                height: 22,
                                child: Checkbox(
                                  value: _rememberMe,
                                  activeColor: const Color(0xFFEA580C),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                                  onChanged: (val) => setState(() => _rememberMe = val ?? false),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: GestureDetector(
                                  onTap: () => setState(() => _rememberMe = !_rememberMe),
                                  child: Text(
                                    _isSinhala
                                        ? 'මෙම උපාංගය දින 30ක් මතක තබා ගන්න'
                                        : 'Remember this workstation for 30 days',
                                    style: TextStyle(
                                      color: labelColor,
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),

                          // ── Primary SIGN IN Button ─────────────────────────
                          SizedBox(
                            width: double.infinity,
                            height: 50,
                            child: ElevatedButton(
                              onPressed: _loading ? null : _submitLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFEA580C),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                disabledBackgroundColor: const Color(0xFFEA580C).withValues(alpha: 0.6),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
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
                                          _isSinhala ? 'පිවිසෙන්න' : 'SIGN IN',
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 0.8,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        const Icon(Icons.arrow_forward_rounded, size: 16),
                                      ],
                                    ),
                            ),
                          ),
                          const SizedBox(height: 24),

                          // ── OR Divider ─────────────────────────────────────
                          Row(
                            children: [
                              Expanded(
                                child: Divider(
                                  color: _isDarkMode ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                                  thickness: 1,
                                ),
                              ),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 14),
                                child: Text(
                                  _isSinhala ? 'හෝ' : 'OR',
                                  style: const TextStyle(
                                    color: Color(0xFF94A3B8),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 1.0,
                                  ),
                                ),
                              ),
                              Expanded(
                                child: Divider(
                                  color: _isDarkMode ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                                  thickness: 1,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 22),

                          // ── Continue with Municipal Google ID Button ───────
                          SizedBox(
                            width: double.infinity,
                            height: 50,
                            child: OutlinedButton(
                              onPressed: () {
                                _selectRole(0);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Municipal SSO preset loaded: citizen@civilanka.gov.lk'),
                                    duration: Duration(seconds: 2),
                                  ),
                                );
                              },
                              style: OutlinedButton.styleFrom(
                                backgroundColor: cardBgColor,
                                side: BorderSide(color: inputBorder),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const GoogleGLogo(size: 19),
                                  const SizedBox(width: 12),
                                  Text(
                                    _isSinhala
                                        ? 'නාගරික Google ID මගින් පිවිසෙන්න'
                                        : 'Continue with Municipal Google ID',
                                    style: TextStyle(
                                      color: titleColor,
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 36),

                          // ── Don't have an account? Create an account ──────
                          Center(
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  _isSinhala ? 'ගිණුමක් නැද්ද? ' : "Don't have an account? ",
                                  style: TextStyle(
                                    color: subtitleColor,
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w400,
                                  ),
                                ),
                                GestureDetector(
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(builder: (_) => const RegisterScreen()),
                                    );
                                  },
                                  child: Text(
                                    _isSinhala ? 'ගිණුමක් සාදන්න' : 'Create an account',
                                    style: const TextStyle(
                                      color: Color(0xFFEA580C),
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 36),

                          // ── Quick Demo Presets Helper (Discrete) ──────────
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: _isDarkMode
                                  ? const Color(0xFF1E293B).withValues(alpha: 0.6)
                                  : const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: _isDarkMode ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(
                                      Icons.bolt_rounded,
                                      color: Color(0xFFF59E0B),
                                      size: 15,
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      _isSinhala ? 'ක්ෂණික DEMO පිවිසුම්:' : 'ONE-TAP DEMO PRESETS:',
                                      style: const TextStyle(
                                        color: Color(0xFF94A3B8),
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w800,
                                        letterSpacing: 0.6,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
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
                                          onTap: () {
                                            _selectRole(i);
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text('Selected ${role['role']}: ${role['email']}'),
                                                duration: const Duration(seconds: 1),
                                              ),
                                            );
                                          },
                                          child: AnimatedContainer(
                                            duration: const Duration(milliseconds: 150),
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                            decoration: BoxDecoration(
                                              color: isSelected
                                                  ? roleColor.withValues(alpha: 0.15)
                                                  : (_isDarkMode ? const Color(0xFF0F172A) : Colors.white),
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(
                                                color: isSelected ? roleColor : inputBorder,
                                                width: isSelected ? 1.5 : 1,
                                              ),
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                Container(
                                                  width: 7,
                                                  height: 7,
                                                  decoration: BoxDecoration(
                                                    shape: BoxShape.circle,
                                                    color: roleColor,
                                                  ),
                                                ),
                                                const SizedBox(width: 6),
                                                Text(
                                                  role['role'] as String,
                                                  style: TextStyle(
                                                    fontSize: 11.5,
                                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                                    color: isSelected ? roleColor : titleColor,
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
                              ],
                            ),
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
      ),
    );
  }
}

/// Official 4-color Google 'G' vector logo
class GoogleGLogo extends StatelessWidget {
  final double size;
  const GoogleGLogo({super.key, this.size = 18});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size),
      painter: _GoogleGPainter(),
    );
  }
}

class _GoogleGPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;
    final double r = w / 2;
    final center = Offset(r, h / 2);
    final strokeWidth = w * 0.22;
    final radius = r - strokeWidth / 2;

    final rect = Rect.fromCircle(center: center, radius: radius);

    final paintBlue = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    final paintGreen = Paint()
      ..color = const Color(0xFF34A853)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    final paintYellow = Paint()
      ..color = const Color(0xFFFBBC05)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    final paintRed = Paint()
      ..color = const Color(0xFFEA4335)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth;

    // Draw arcs matching Google's 4-color G
    canvas.drawArc(rect, -0.6, 1.2, false, paintBlue);
    canvas.drawArc(rect, 0.6, 1.3, false, paintGreen);
    canvas.drawArc(rect, 1.9, 1.1, false, paintYellow);
    canvas.drawArc(rect, 3.0, 1.4, false, paintRed);

    // Horizontal bar of G in blue
    final barPaint = Paint()
      ..color = const Color(0xFF4285F4)
      ..style = PaintingStyle.fill;
    canvas.drawRect(
      Rect.fromLTRB(
        center.dx - strokeWidth * 0.1,
        center.dy - strokeWidth / 2,
        center.dx + radius + strokeWidth * 0.1,
        center.dy + strokeWidth / 2,
      ),
      barPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
