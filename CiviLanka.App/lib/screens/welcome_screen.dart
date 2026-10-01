import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/auth_state.dart';
import 'auth/register_screen.dart';
import 'citizen/report_hazard_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key});

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  final _scrollController = ScrollController();
  final _loginSectionKey = GlobalKey();
  final _formKey = GlobalKey<FormState>();

  bool _isSinhala = false;
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
      'desc': 'Report road & water hazards, track resolution live',
      'color': Color(0xFFF59E0B),
    },
    {
      'role': 'Field Worker',
      'email': 'fieldworker@test.com',
      'password': 'Director123!',
      'icon': Icons.engineering_outlined,
      'badge': 'FIELD OPS',
      'desc': 'Receive assigned work orders, upload repair proof, sign off',
      'color': Color(0xFF06B6D4),
    },
    {
      'role': 'Supervisor',
      'email': 'supervisor@test.com',
      'password': 'Director123!',
      'icon': Icons.supervisor_account_outlined,
      'badge': 'TRIAGE & BOQ',
      'desc': 'Approve material estimates, allocate crews, review triage',
      'color': Color(0xFFEA580C),
    },
    {
      'role': 'Director',
      'email': 'director@test.com',
      'password': 'Director123!',
      'icon': Icons.admin_panel_settings_outlined,
      'badge': 'GOVERNANCE',
      'desc': 'Citywide analytics, fiscal budgets, audit ledger',
      'color': Color(0xFF8B5CF6),
    },
  ];

  final List<Map<String, dynamic>> _partnerAgencies = [
    {'name': 'Government of Sri Lanka', 'short': 'Gov LK', 'logo': 'assets/images/gov.png'},
    {'name': 'Road Development Authority', 'short': 'RDA', 'logo': 'assets/images/rda_trans.png'},
    {'name': 'Ceylon Electricity Board', 'short': 'CEB', 'logo': 'assets/images/ceb.png'},
    {'name': 'National Water Supply & Drainage Board', 'short': 'NWSDB', 'logo': 'assets/images/water_trans.png'},
    {'name': 'Sri Lanka Transport Board', 'short': 'SLTB', 'logo': 'assets/images/sltb_trans.png'},
    {'name': 'Lanka Metro Transit Authority', 'short': 'Metro Transit', 'logo': 'assets/images/metro_trans.png'},
  ];

  final List<Map<String, dynamic>> _aiAgents = [
    {
      'number': '01',
      'title': 'Hazard Classification Agent',
      'titleSi': 'උපද්‍රව වර්ගීකරණ ස්නායු නියෝජිතයා',
      'badge': 'VISION & DEFECT TRIAGE',
      'image': 'assets/images/fredrik-posse-LVqjs1bDGFs-unsplash.jpg',
      'color': Color(0xFFF59E0B),
      'summary':
          'Analyzes citizen photos and descriptions to classify defects, determine severity (Low to Critical), and calculate emergency response hours.',
      'summarySi':
          'පුරවැසි ඡායාරූප විශ්ලේෂණය කර දෝෂ වර්ගීකරණය, බරපතලකම සහ හදිසි ප්‍රතිචාර කාලය තීරණය කරයි.',
      'features': [
        'Pothole, water leak, and road fracture classification',
        'Colombo geodetic coordinate validation',
        'Automated SLA priority and response scheduling',
      ],
    },
    {
      'number': '02',
      'title': 'Asset Risk Prediction Agent',
      'titleSi': 'වත්කම් අවදානම් පුරෝකථන නියෝජිතයා',
      'badge': 'STRUCTURAL HEALTH',
      'image': 'assets/images/asserts_agent.jpg',
      'color': Color(0xFF3B82F6),
      'summary':
          'Forecasts asset deterioration velocity and failure likelihood across roads, water pipes, and public infrastructure using historical inspection records.',
      'summarySi':
          'ඓතිහාසික වාර්තා උපයෝගී කරගනිමින් මාර්ග සහ නල පද්ධතිවල පිරිහීම හා අවදානම කල්තියා පුරෝකථනය කරයි.',
      'features': [
        'Quantitative risk index scoring (0–100)',
        'Imminent structural failure prediction',
        'Recommended inspection frequency scheduling',
      ],
    },
    {
      'number': '03',
      'title': 'BOQ Cost & Material Estimator',
      'titleSi': 'පිරිවැය සහ ද්‍රව්‍ය ඇස්තමේන්තු නියෝජිතයා',
      'badge': 'FISCAL GOVERNANCE',
      'image': 'assets/images/yuheng-ouyang-2r0Eo89ZSQk-unsplash.jpg',
      'color': Color(0xFFEA580C),
      'summary':
          'Generates detailed Bill of Quantities (BOQ) with materials, equipment, and labour rates in LKR, automatically flagging supervisor approval thresholds.',
      'summarySi':
          'ද්‍රව්‍ය, ශ්‍රමය සහ උපකරණ පිරිවැය සහිත නිවැරදි BOQ වාර්තා LKR වලින් ස්වයංක්‍රීයව සකස් කරයි.',
      'features': [
        'Asphalt, concrete, and pipe material estimation',
        'Crew size and labour duration calculation',
        'Supervisor (≥100k) & Director (≥500k LKR) threshold flags',
      ],
    },
    {
      'number': '04',
      'title': 'Safety & Compliance Verifier',
      'titleSi': 'ආරක්ෂාව සහ අනුකූලතා තහවුරුකාරකය',
      'badge': 'EVIDENCE AUDIT',
      'image': 'assets/images/pexels-jan-van-der-wolf-11680885-29114485.jpg',
      'color': Color(0xFF10B981),
      'summary':
          'Audits field contractor submissions, inspecting before/after photo evidence and digital checklists against municipal safety standards before closure.',
      'summarySi':
          'අලුත්වැඩියාවට පෙර සහ පසු ඡායාරූප සාක්ෂි පරීක්ෂා කර නාගරික ප්‍රමිතීන්ට අනුකූල බව තහවුරු කරයි.',
      'features': [
        'Before & after photo verification',
        'On-site physical hazard detection',
        'Cryptographic ledger audit log for municipal treasury',
      ],
    },
  ];

  final List<Map<String, dynamic>> _workflowSteps = [
    {
      'step': '01',
      'title': 'Citizen Report & AI Triage',
      'titleSi': 'පුරවැසි වාර්තාව සහ AI වර්ගීකරණය',
      'icon': Icons.camera_alt_outlined,
      'color': Color(0xFFF59E0B),
      'desc':
          'Citizens capture geotagged defect photos without delay. Gemini vision classifies defect severity, priority, and response SLA within seconds.',
      'descSi':
          'පුරවැසියන් දෝෂ සහිත ස්ථානයේ ඡායාරූප ලබා දෙයි. AI තත්පර කිහිපයකින් බරපතලකම සහ ප්‍රමුඛතාව තීරණය කරයි.',
    },
    {
      'step': '02',
      'title': 'Asset Risk & Health Forecast',
      'titleSi': 'වත්කම් අවදානම් පුරෝකථනය',
      'icon': Icons.trending_up_rounded,
      'color': Color(0xFF3B82F6),
      'desc':
          'Predictive neural models calculate asset degradation indices, flood exposure, and structural fatigue to prioritize preventative interventions.',
      'descSi':
          'ස්නායුක ආකෘති මඟින් යටිතල පහසුකම්වල නිරවද්‍යතාව සහ ආයු කාලය තක්සේරු කරයි.',
    },
    {
      'step': '03',
      'title': 'BOQ Estimation & Approval',
      'titleSi': 'BOQ ඇස්තමේන්තුව සහ අනුමැතිය',
      'icon': Icons.account_balance_wallet_outlined,
      'color': Color(0xFFEA580C),
      'desc':
          'The estimator agent generates exact material quantities, labour hours, and costs in LKR. High-value work orders route automatically to directors.',
      'descSi':
          'ද්‍රව්‍ය ප්‍රමාණයන් සහ LKR පිරිවැය ගණනය කර අදාළ නිලධාරීන්ගේ අනුමැතිය සඳහා යොමු කෙරේ.',
    },
    {
      'step': '04',
      'title': 'Field Execution & Verification',
      'titleSi': 'ක්ෂේත්‍ර අලුත්වැඩියාව සහ තහවුරු කිරීම',
      'icon': Icons.build_circle_outlined,
      'color': Color(0xFF10B981),
      'desc':
          'Contractors receive dispatched work orders with turn-by-turn routing. AI compares before/after photographic evidence before payment sign-off.',
      'descSi':
          'ක්‍ෂේත්‍ර කණ්ඩායම් වැඩ අවසන් කර ඡායාරූප සාක්ෂි ඉදිරිපත් කරයි. AI මඟින් කාර්යය තහවුරු කරයි.',
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
    final ctx = _loginSectionKey.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(
        ctx,
        duration: const Duration(milliseconds: 700),
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
      backgroundColor: const Color(0xFF0A0F1D),
      body: SafeArea(
        child: SingleChildScrollView(
          controller: _scrollController,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildTopBar(),
              _buildHeroSection(),
              _buildAuthoritiesTicker(),
              _buildMetricsStrip(),
              _buildAIAgentsShowcase(),
              _buildWorkflowPipeline(),
              _buildLoginSection(),
              _buildMunicipalFooter(),
            ],
          ),
        ),
      ),
    );
  }

  // ── 1. Top Navigation Bar (matching CiviLankaLogo.tsx & Navbar) ───────────
  Widget _buildTopBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A).withValues(alpha: 0.95),
        border: const Border(bottom: BorderSide(color: Color(0xFF1E293B))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Brand Emblem + Wordmark
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.6), width: 1.5),
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
                    errorBuilder: (_, __, ___) => const Icon(Icons.shield, color: Color(0xFFF59E0B), size: 20),
                  ),
                ),
              ),
              const SizedBox(width: 8),
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
                          fontSize: 16,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFFD97706), Color(0xFFB45309)],
                          ),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.4), width: 0.8),
                        ),
                        child: const Text(
                          'AI',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 9.5,
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
                      fontSize: 8,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.0,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ],
          ),

          // Action CTAs (Language + Sign In)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Language Switcher
              InkWell(
                onTap: () => setState(() => _isSinhala = !_isSinhala),
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.language_rounded, color: Color(0xFFFBBF24), size: 13),
                      const SizedBox(width: 4),
                      Text(
                        _isSinhala ? 'English' : 'සිංහල',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 6),

              // Sign In CTA
              GestureDetector(
                onTap: _scrollToLogin,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.shield_outlined, size: 12, color: Color(0xFFF59E0B)),
                      const SizedBox(width: 4),
                      Text(
                        _isSinhala ? 'පිවිසෙන්න' : 'Sign In',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
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

  // ── 2. Cinematic Hero Section (matching LandingPage.tsx) ───────────────────
  Widget _buildHeroSection() {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0A0F1D),
        image: DecorationImage(
          image: AssetImage('assets/images/cinematic_aerial_city_hero.jpg'),
          fit: BoxFit.cover,
          colorFilter: ColorFilter.mode(
            Color(0xDF0A0F1D),
            BlendMode.darken,
          ),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(20, 36, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Eyebrow Tagline
          Text(
            _isSinhala
                ? 'ජාතික නාගරික යටිතල පහසුකම් බුද්ධිමය වේදිකාව'
                : 'National Municipal Infrastructure Intelligence Platform',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFFF59E0B),
              fontSize: 12,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 14),

          // Editorial Headline
          RichText(
            textAlign: TextAlign.center,
            text: TextSpan(
              children: [
                TextSpan(
                  text: _isSinhala ? 'වඩාත් සුහුරු\nයටිතල පහසුකම්.\n' : 'Smarter\nInfrastructure.\n',
                  style: const TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    height: 1.15,
                    letterSpacing: -0.8,
                  ),
                ),
                TextSpan(
                  text: _isSinhala ? 'සුරක්ෂිත නගර.' : 'Safer Cities.',
                  style: const TextStyle(
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFFFBBF24),
                    height: 1.15,
                    letterSpacing: -0.8,
                    shadows: [
                      Shadow(
                        color: Color(0x80F59E0B),
                        blurRadius: 16,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Subtitle Description
          Text(
            _isSinhala
                ? 'පුරවැසි වාර්තාවල සිට ස්නායු දෝෂ වර්ගීකරණය, පුරෝකථන වත්කම් අවදානම් සහ විනිවිද පෙනෙන මූල්‍ය පාලනය හරහා නඩත්තු ප්‍රතිචාර කඩිනම් කිරීම.'
                : 'CiviLanka AI accelerates municipal maintenance response from citizen reports to verified repairs with neural defect classification, predictive asset risk, and transparent fiscal governance.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.88),
              fontSize: 13,
              height: 1.5,
              fontWeight: FontWeight.w400,
            ),
          ),
          const SizedBox(height: 24),

          // Two Action CTAs (Report & Sign In)
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ReportHazardScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFEA580C),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 6,
                    shadowColor: const Color(0xFFEA580C).withValues(alpha: 0.4),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.warning_amber_rounded, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        _isSinhala ? 'උපද්‍රවයක් වාර්තා කරන්න' : 'Report an Issue',
                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(width: 6),
                      const Icon(Icons.arrow_forward_rounded, size: 16),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: _scrollToLogin,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Color(0xFF334155), width: 1.5),
                    backgroundColor: const Color(0xFF1E293B).withValues(alpha: 0.8),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.shield_outlined, size: 17, color: Color(0xFFFBBF24)),
                      const SizedBox(width: 8),
                      Text(
                        _isSinhala ? 'පද්ධතියට පිවිසෙන්න' : 'Sign In to Portal',
                        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold),
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

  // ── 3. Integrated Public Authorities Horizontal Slider ────────────────────
  Widget _buildAuthoritiesTicker() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        border: Border(
          top: BorderSide(color: Color(0xFF1E293B)),
          bottom: BorderSide(color: Color(0xFF1E293B)),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              _isSinhala ? 'ශ්‍රී ලංකා නාගරික හා යටිතල පහසුකම් ආයතනික සහයෝගීතාව' : 'IN PARTNERSHIP WITH SRI LANKAN MUNICIPAL AUTHORITIES',
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 9.5,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                fontFamily: 'monospace',
              ),
            ),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: _partnerAgencies.map((agency) {
                return Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Image.asset(
                          agency['logo'] as String,
                          height: 24,
                          errorBuilder: (_, __, ___) => const Icon(Icons.account_balance, color: Colors.white70, size: 20),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          agency['short'] as String,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  // ── 4. Key Metrics Strip ──────────────────────────────────────────────────
  Widget _buildMetricsStrip() {
    final metrics = [
      {'val': '4', 'label': _isSinhala ? 'AI නියෝජිතයින්' : 'AI Agents', 'color': const Color(0xFFF59E0B)},
      {'val': '< 4h', 'label': _isSinhala ? 'ප්‍රතිචාර කාලය' : 'Triage SLA', 'color': const Color(0xFF06B6D4)},
      {'val': '100%', 'label': _isSinhala ? 'තහවුරු කිරීම්' : 'Audit Verified', 'color': const Color(0xFF10B981)},
      {'val': 'GIS', 'label': _isSinhala ? 'භූගෝලීය පද්ධතිය' : 'Geodetic Grid', 'color': const Color(0xFF8B5CF6)},
    ];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: metrics.map((m) {
          return Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                m['val'] as String,
                style: TextStyle(
                  color: m['color'] as Color,
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                m['label'] as String,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }

  // ── 5. AI Agents Architecture Showcase (matching LandingPage.tsx) ──────────
  Widget _buildAIAgentsShowcase() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section Header
          Text(
            _isSinhala ? 'බහු-නියෝජිත ස්නායු පද්ධතිය' : 'MULTI-AGENT NEURAL FABRIC',
            style: const TextStyle(
              color: Color(0xFFF59E0B),
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.0,
              fontFamily: 'monospace',
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _isSinhala ? 'විශේෂඥ ස්වයංක්‍රීය නියෝජිතයින් 4 දෙනා' : 'Four Specialized Autonomous Agents',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 16),

          // 4 Agent Cards
          Column(
            children: _aiAgents.map((agent) {
              final agentColor = agent['color'] as Color;

              return Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Agent Visual Header
                      Stack(
                        children: [
                          SizedBox(
                            height: 140,
                            width: double.infinity,
                            child: Image.asset(
                              agent['image'] as String,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => Container(color: agentColor.withValues(alpha: 0.15)),
                            ),
                          ),
                          Positioned.fill(
                            child: Container(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [
                                  Colors.transparent,
                                  const Color(0xFF1E293B).withValues(alpha: 0.95),
                                ],
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 12,
                          left: 12,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.75),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: agentColor.withValues(alpha: 0.5)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  agent['number'] as String,
                                  style: TextStyle(
                                    color: agentColor,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  agent['badge'] as String,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: 0.6,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),

                    // Agent Details
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _isSinhala ? agent['titleSi'] as String : agent['title'] as String,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _isSinhala ? agent['summarySi'] as String : agent['summary'] as String,
                            style: const TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 12.5,
                              height: 1.45,
                            ),
                          ),
                          const SizedBox(height: 12),

                          // Bullet points
                          ...((agent['features'] as List<String>).map((feat) {
                            return Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(Icons.check_circle_rounded, size: 14, color: agentColor),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      feat,
                                      style: const TextStyle(color: Colors.white70, fontSize: 11.5),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          })),
                        ],
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

  // ── 6. How It Works Workflow Pipeline ─────────────────────────────────────
  Widget _buildWorkflowPipeline() {
    return Container(
      color: const Color(0xFF0F172A),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _isSinhala ? 'සම්පූර්ණ ක්‍රියාදාමය' : 'END-TO-END AUTOMATION PIPELINE',
            style: const TextStyle(
              color: Color(0xFF06B6D4),
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.0,
              fontFamily: 'monospace',
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _isSinhala ? 'පුරවැසි වාර්තාවේ සිට තහවුරු කළ අලුත්වැඩියාව දක්වා' : 'From Citizen Defect to Verified Repair',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 20),

          Column(
            children: _workflowSteps.map((step) {
              final stepColor = step['color'] as Color;

              return Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFF334155)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: stepColor.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: stepColor.withValues(alpha: 0.4)),
                        ),
                        child: Icon(step['icon'] as IconData, color: stepColor, size: 22),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  'STEP ${step['step']}',
                                  style: TextStyle(
                                    color: stepColor,
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w900,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _isSinhala ? step['titleSi'] as String : step['title'] as String,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              _isSinhala ? step['descSi'] as String : step['desc'] as String,
                              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, height: 1.4),
                            ),
                          ],
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

  // ── 7. Interactive Sign In Section (matching LoginPage.tsx) ───────────────
  Widget _buildLoginSection() {
    return Container(
      key: _loginSectionKey,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
      decoration: const BoxDecoration(
        color: Color(0xFF0A0F1D),
        border: Border(top: BorderSide(color: Color(0xFF1E293B))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Section Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
            decoration: BoxDecoration(
              color: const Color(0xFFEA580C).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFEA580C).withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_outline_rounded, size: 13, color: Color(0xFFEA580C)),
                const SizedBox(width: 6),
                Text(
                  _isSinhala ? 'නාගරික පිවිසුම් ද්වාරය' : 'MUNICIPAL AUTHENTICATION GATEWAY',
                  style: const TextStyle(
                    color: Color(0xFFEA580C),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          Text(
            _isSinhala ? 'පද්ධතියට පිවිසෙන්න' : 'Sign In to CiviLanka',
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            _isSinhala ? 'ඔබගේ නිල ගිණුම තෝරන්න හෝ අක්තපත්‍ර ඇතුළත් කරන්න' : 'Select a demo persona or enter municipal credentials',
            style: const TextStyle(fontSize: 12.5, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 20),

          // Demo Persona Quick-Fill Chips
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              _isSinhala ? 'ක්ෂණික පිවිසුම් භූමිකාව (Quick Demo):' : 'One-Tap Demo Persona:',
              style: const TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 10),

          // 4 Personas
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
                    onTap: () => _applyDemoPreset(i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected ? roleColor.withValues(alpha: 0.22) : const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isSelected ? roleColor : const Color(0xFF334155),
                          width: isSelected ? 1.5 : 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(role['icon'] as IconData, size: 16, color: isSelected ? roleColor : Colors.white70),
                          const SizedBox(width: 8),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                role['role'] as String,
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                                  color: isSelected ? Colors.white : Colors.white70,
                                ),
                              ),
                              Text(
                                role['badge'] as String,
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected ? roleColor : const Color(0xFF64748B),
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          const SizedBox(height: 20),

          // Form Box
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Form(
              key: _formKey,
              child: Column(
                children: [
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

                  // Email
                  TextFormField(
                    controller: _emailCtrl,
                    keyboardType: TextInputType.emailAddress,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      labelText: _isSinhala ? 'විද්‍යුත් තැපෑල (Email)' : 'Official Email',
                      labelStyle: const TextStyle(color: Colors.white60, fontSize: 12),
                      prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF94A3B8), size: 18),
                      filled: true,
                      fillColor: const Color(0xFF0F172A),
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
                  const SizedBox(height: 14),

                  // Password
                  TextFormField(
                    controller: _passwordCtrl,
                    obscureText: _obscurePassword,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      labelText: _isSinhala ? 'මුරපදය (Password)' : 'Password',
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
                      fillColor: const Color(0xFF0F172A),
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
                  const SizedBox(height: 20),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submitLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEA580C),
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: const Color(0xFFEA580C).withValues(alpha: 0.5),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 4,
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
                                const Icon(Icons.login_rounded, size: 18),
                                const SizedBox(width: 8),
                                Text(
                                  _isSinhala ? 'පිවිසෙන්න' : 'Authenticate & Sign In',
                                  style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(width: 6),
                                const Icon(Icons.arrow_forward_rounded, size: 16),
                              ],
                            ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Citizen Register Link
                  Center(
                    child: TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const RegisterScreen()),
                        );
                      },
                      child: Text(
                        _isSinhala ? 'නව පුරවැසියෙක්ද? ලියාපදිංචි වන්න' : 'New Citizen? Register an account',
                        style: const TextStyle(
                          color: Color(0xFF38BDF8),
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── 8. Municipal Footer ───────────────────────────────────────────────────
  Widget _buildMunicipalFooter() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      decoration: const BoxDecoration(
        color: Color(0xFF020617),
        border: Border(top: BorderSide(color: Color(0xFF1E293B))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 7,
                height: 7,
                decoration: const BoxDecoration(
                  color: Color(0xFF10B981),
                  shape: BoxShape.circle,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Colombo Municipal Infrastructure Ops Operational',
                style: TextStyle(
                  color: Color(0xFF10B981),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Democratic Socialist Republic of Sri Lanka • Colombo Municipal Council',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF64748B), fontSize: 10.5),
          ),
          const SizedBox(height: 4),
          const Text(
            'CivitaGuard AI • Unified Municipal Intelligence Platform v1.0.0',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF475569), fontSize: 9.5, fontFamily: 'monospace'),
          ),
        ],
      ),
    );
  }
}
