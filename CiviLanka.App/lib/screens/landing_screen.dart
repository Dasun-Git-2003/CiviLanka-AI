import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/auth_state.dart';
import '../theme/app_colors.dart';
import 'register_screen.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> {
  final _scrollController = ScrollController();
  final _loginSectionKey = GlobalKey();
  final _formKey = GlobalKey<FormState>();

  final _emailCtrl = TextEditingController(text: 'citizen@civilanka.gov.lk');
  final _passwordCtrl = TextEditingController(text: 'Director123!');
  bool _obscurePassword = true;
  bool _loading = false;
  String? _errorMessage;
  int _selectedRoleIndex = 0; // 0: Citizen, 1: Field Worker, 2: Supervisor, 3: Director

  final List<Map<String, dynamic>> _demoRoles = [
    {
      'role': 'Citizen',
      'email': 'citizen@civilanka.gov.lk',
      'password': 'Director123!',
      'icon': Icons.person_outline_rounded,
      'badge': 'CIVILIAN',
      'desc': 'Report road & water hazards, track SLA resolution live',
      'color': AppColors.primary,
    },
    {
      'role': 'Field Worker',
      'email': 'worker@civilanka.gov.lk',
      'password': 'Director123!',
      'icon': Icons.engineering_outlined,
      'badge': 'FIELD OPS',
      'desc': 'Receive assigned work orders, upload repair proof, sign off',
      'color': AppColors.cyan,
    },
    {
      'role': 'Supervisor',
      'email': 'supervisor@civilanka.gov.lk',
      'password': 'Director123!',
      'icon': Icons.supervisor_account_outlined,
      'badge': 'TRIAGE & BOQ',
      'desc': 'Approve material estimates, allocate crews, review triage',
      'color': AppColors.medium,
    },
    {
      'role': 'Director',
      'email': 'director@civilanka.gov.lk',
      'password': 'Director123!',
      'icon': Icons.admin_panel_settings_outlined,
      'badge': 'GOVERNANCE',
      'desc': 'Citywide analytics, fiscal budgets, audit ledger',
      'color': AppColors.purple,
    },
  ];

  @override
  void dispose() {
    _scrollController.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  void _applyDemoPreset(int index) {
    setState(() {
      _selectedRoleIndex = index;
      _emailCtrl.text = _demoRoles[index]['email'] as String;
      _passwordCtrl.text = _demoRoles[index]['password'] as String;
      _errorMessage = null;
    });
  }

  void _scrollToLogin() {
    final context = _loginSectionKey.currentContext;
    if (context != null) {
      Scrollable.ensureVisible(
        context,
        duration: const Duration(milliseconds: 600),
        curve: Curves.easeInOutCubic,
      );
    }
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
    return Scaffold(
      backgroundColor: AppColors.bgDark,
      body: SafeArea(
        child: SingleChildScrollView(
          controller: _scrollController,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildTopBar(),
              _buildHeroSection(),
              _buildMetricsStrip(),
              _buildAIAgentsShowcase(),
              _buildHowItWorks(),
              _buildLoginSection(),
              _buildMunicipalFooter(),
            ],
          ),
        ),
      ),
    );
  }

  // ── 1. Top Navigation Bar ────────────────────────────────────────────────
  Widget _buildTopBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceDark.withValues(alpha: 0.6),
        border: const Border(bottom: BorderSide(color: AppColors.borderDark)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.cyan],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.shield_outlined,
                  color: Colors.black,
                  size: 22,
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'CiviLanka AI',
                    style: TextStyle(
                      color: AppColors.textLight,
                      fontWeight: FontWeight.w900,
                      fontSize: 16,
                      letterSpacing: -0.3,
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      const Text(
                        'Colombo Municipal Ops',
                        style: TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          ElevatedButton.icon(
            onPressed: _scrollToLogin,
            icon: const Icon(Icons.lock_open_rounded, size: 14),
            label: const Text('Sign In'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.cardDark,
              foregroundColor: AppColors.primaryLight,
              side: const BorderSide(color: AppColors.primaryDark),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  // ── 2. Hero Section ──────────────────────────────────────────────────────
  Widget _buildHeroSection() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withValues(alpha: 0.08),
            Colors.transparent,
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: AppColors.primaryLight,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                const Text(
                  'COLOMBO AUTONOMOUS MUNICIPAL OPS',
                  style: TextStyle(
                    color: AppColors.primaryLight,
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.6,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Smart Infrastructure &\nCivic Defect Intelligence',
            style: TextStyle(
              color: AppColors.textLight,
              fontSize: 26,
              fontWeight: FontWeight.w900,
              height: 1.2,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Report public hazards with instant computer vision AI triage. Colombo Municipal teams execute audited work orders with verified geodetic compliance.',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: _scrollToLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 3,
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Access Portal',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(width: 6),
                      Icon(Icons.arrow_forward_rounded, size: 16),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    _applyDemoPreset(0);
                    _scrollToLogin();
                  },
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textLight,
                    side: const BorderSide(color: AppColors.borderDark),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text(
                    'Citizen Demo',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── 3. Metrics Strip ─────────────────────────────────────────────────────
  Widget _buildMetricsStrip() {
    final metrics = [
      {'val': '4', 'label': 'AI Agents', 'color': AppColors.primary},
      {'val': '< 4h', 'label': 'Triage SLA', 'color': AppColors.cyan},
      {'val': '100%', 'label': 'Audit Verified', 'color': AppColors.medium},
      {'val': 'GIS', 'label': 'Geodetic Grid', 'color': AppColors.purple},
    ];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surfaceDark,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderDark),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: metrics.map((m) {
          return Column(
            children: [
              Text(
                m['val'] as String,
                style: TextStyle(
                  color: m['color'] as Color,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                m['label'] as String,
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  // ── 4. 4 AI Agents Showcase ──────────────────────────────────────────────
  Widget _buildAIAgentsShowcase() {
    final agents = [
      {
        'num': '01',
        'title': 'Hazard Classification Agent',
        'tag': 'VISION & DEFECT TRIAGE',
        'desc': 'Analyzes citizen photos to classify potholes, water leaks, and live cables with instant SLA emergency response hours.',
        'icon': Icons.document_scanner_rounded,
        'color': AppColors.medium,
      },
      {
        'num': '02',
        'title': 'Asset Risk Prediction Agent',
        'tag': 'STRUCTURAL HEALTH',
        'desc': 'Forecasts asset deterioration velocity and failure likelihood across bridges, culverts, and Colombo road networks.',
        'icon': Icons.trending_up_rounded,
        'color': AppColors.cyan,
      },
      {
        'num': '03',
        'title': 'BOQ Cost & Material Estimator',
        'tag': 'FISCAL GOVERNANCE',
        'desc': 'Generates detailed Bill of Quantities with materials, equipment, and labour rates in LKR with approval threshold alerts.',
        'icon': Icons.calculate_outlined,
        'color': AppColors.primary,
      },
      {
        'num': '04',
        'title': 'Safety & Compliance Verifier',
        'tag': 'EVIDENCE AUDIT',
        'desc': 'Audits before/after repair proof and enforces 50m spatial geofence tolerance before sign-off on public works.',
        'icon': Icons.verified_user_rounded,
        'color': AppColors.purple,
      },
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 18,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Autonomous Municipal AI Suite',
                style: TextStyle(
                  color: AppColors.textLight,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Powered by Google Gemini 2.0 with Colombo spatial grounding',
            style: TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
          const SizedBox(height: 14),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: agents.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (ctx, i) {
              final a = agents[i];
              final color = a['color'] as Color;
              return Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.cardDark,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.borderDark),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: color.withValues(alpha: 0.3)),
                      ),
                      child: Icon(a['icon'] as IconData, color: color, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  a['tag'] as String,
                                  style: TextStyle(
                                    color: color,
                                    fontSize: 8.5,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ),
                              Text(
                                a['num'] as String,
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 11,
                                  fontFamily: 'monospace',
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            a['title'] as String,
                            style: const TextStyle(
                              color: AppColors.textLight,
                              fontSize: 13.5,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            a['desc'] as String,
                            style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontSize: 11.5,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  // ── 5. How It Works ──────────────────────────────────────────────────────
  Widget _buildHowItWorks() {
    final steps = [
      {
        'step': '1',
        'title': 'Snap & Geotag',
        'desc': 'Citizen takes photo with geodetic GPS coordinates',
      },
      {
        'step': '2',
        'title': 'Instant AI Triage',
        'desc': 'Vision agent assigns severity, priority & response window',
      },
      {
        'step': '3',
        'title': 'Verified Repair',
        'desc': 'Field teams execute repair under compliance geofence audit',
      },
    ];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceDark.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderDark),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'How Civic Triage Works',
            style: TextStyle(
              color: AppColors.textLight,
              fontSize: 14,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: steps.map((s) {
              return Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 14,
                        backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                        child: Text(
                          s['step']!,
                          style: const TextStyle(
                            color: AppColors.primaryLight,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        s['title']!,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AppColors.textLight,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        s['desc']!,
                        textAlign: TextAlign.center,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 9.5,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  // ── 6. Interactive Login Section ─────────────────────────────────────────
  Widget _buildLoginSection() {
    return Container(
      key: _loginSectionKey,
      margin: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppColors.cardDark,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.4), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.08),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.login_rounded, color: AppColors.primary, size: 20),
                ),
                const SizedBox(width: 10),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Municipal Sign In',
                      style: TextStyle(
                        color: AppColors.textLight,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Choose demo preset or enter your credentials',
                      style: TextStyle(color: AppColors.textMuted, fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Demo Role Tabs
            const Text(
              'ONE-TAP ROLE DEMO PRESETS',
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.6,
              ),
            ),
            const SizedBox(height: 8),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(_demoRoles.length, (index) {
                  final role = _demoRoles[index];
                  final isSelected = _selectedRoleIndex == index;
                  final color = role['color'] as Color;

                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      selected: isSelected,
                      onSelected: (_) => _applyDemoPreset(index),
                      avatar: Icon(
                        role['icon'] as IconData,
                        size: 14,
                        color: isSelected ? Colors.black : color,
                      ),
                      label: Text(
                        role['role'] as String,
                        style: TextStyle(
                          color: isSelected ? Colors.black : AppColors.textSecondary,
                          fontWeight: FontWeight.bold,
                          fontSize: 11.5,
                        ),
                      ),
                      selectedColor: color,
                      backgroundColor: AppColors.surfaceDark,
                      side: BorderSide(
                        color: isSelected ? color : AppColors.borderDark,
                      ),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      showCheckmark: false,
                    ),
                  );
                }),
              ),
            ),
            const SizedBox(height: 12),

            // Selected Role description banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: (_demoRoles[_selectedRoleIndex]['color'] as Color).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: (_demoRoles[_selectedRoleIndex]['color'] as Color).withValues(alpha: 0.25),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline_rounded,
                    size: 14,
                    color: _demoRoles[_selectedRoleIndex]['color'] as Color,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _demoRoles[_selectedRoleIndex]['desc'] as String,
                      style: const TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Email Input
            TextFormField(
              controller: _emailCtrl,
              keyboardType: TextInputType.emailAddress,
              style: const TextStyle(color: AppColors.textLight, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Email Address',
                labelStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                prefixIcon: const Icon(Icons.email_outlined, color: AppColors.textMuted, size: 18),
                filled: true,
                fillColor: AppColors.surfaceDark,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderDark),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderDark),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                ),
              ),
              validator: (v) {
                if (v == null || v.trim().isEmpty) return 'Please enter email';
                if (!v.contains('@')) return 'Enter a valid email';
                return null;
              },
            ),
            const SizedBox(height: 12),

            // Password Input
            TextFormField(
              controller: _passwordCtrl,
              obscureText: _obscurePassword,
              style: const TextStyle(color: AppColors.textLight, fontSize: 13),
              decoration: InputDecoration(
                labelText: 'Password',
                labelStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppColors.textMuted, size: 18),
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                    color: AppColors.textMuted,
                    size: 18,
                  ),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
                filled: true,
                fillColor: AppColors.surfaceDark,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderDark),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.borderDark),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                ),
              ),
              validator: (v) {
                if (v == null || v.isEmpty) return 'Please enter password';
                return null;
              },
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.critical.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppColors.critical.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, color: AppColors.critical, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: AppColors.critical, fontSize: 11),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 16),

            // Sign In Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _loading ? null : _submitLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                  disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 2,
                ),
                child: _loading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Sign In to CiviLanka',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          SizedBox(width: 8),
                          Icon(Icons.login_rounded, size: 16),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 12),

            // Citizen Registration link
            Center(
              child: TextButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const RegisterScreen()),
                  );
                },
                icon: const Icon(Icons.person_add_alt_1_outlined, size: 15, color: AppColors.primaryLight),
                label: const Text(
                  'New Citizen? Register Account',
                  style: TextStyle(
                    color: AppColors.primaryLight,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── 7. Municipal Footer ──────────────────────────────────────────────────
  Widget _buildMunicipalFooter() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      decoration: const BoxDecoration(
        color: AppColors.bgDark,
        border: Border(top: BorderSide(color: AppColors.borderDark)),
      ),
      child: Column(
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.location_city_rounded, color: AppColors.textMuted, size: 14),
              SizedBox(width: 6),
              Text(
                'Colombo Municipal Council (CMC)',
                style: TextStyle(color: AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w600),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            'Smart Cities & Urban Resilience Initiative • Sri Lanka',
            style: TextStyle(color: AppColors.textMuted, fontSize: 10),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.surfaceDark,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderDark),
            ),
            child: const Text(
              'Emergency Hotline: 1990 / 011-2691111',
              style: TextStyle(
                color: AppColors.cyan,
                fontSize: 10,
                fontFamily: 'monospace',
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
