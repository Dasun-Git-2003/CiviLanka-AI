import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController(text: 'citizen@test.com');
  final _passwordController = TextEditingController(text: 'Director123!');
  bool _obscurePassword = true;
  bool _loading = false;
  String? _errorMessage;
  int _selectedRoleIndex = 0;

  void _applyDemoPreset(int roleIndex) {
    setState(() {
      _selectedRoleIndex = roleIndex;
      if (roleIndex == 0) {
        _emailController.text = 'citizen@test.com';
        _passwordController.text = 'Director123!';
      } else {
        _emailController.text = 'fieldworker@test.com';
        _passwordController.text = 'Director123!';
      }
      _errorMessage = null;
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final authService = context.read<AuthService>();
      await authService.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
    } catch (e) {
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 58,
                  height: 58,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.35),
                        blurRadius: 14,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.shield_outlined, color: Colors.white, size: 32),
                ),
                const SizedBox(height: 16),
                const Text(
                  'CiviLanka AI',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: AppColors.textDark,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Smart Municipal Asset & Hazard Triage',
                  style: TextStyle(fontSize: 13, color: AppColors.textGrey),
                ),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: AppColors.slate200,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => _applyDemoPreset(0),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _selectedRoleIndex == 0 ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(9),
                              boxShadow: _selectedRoleIndex == 0
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.06),
                                        blurRadius: 4,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.person_pin,
                                  size: 16,
                                  color: _selectedRoleIndex == 0 ? AppColors.primary : AppColors.slate500,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Citizen Portal',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: _selectedRoleIndex == 0 ? FontWeight.bold : FontWeight.w600,
                                    color: _selectedRoleIndex == 0 ? AppColors.primary : AppColors.slate600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => _applyDemoPreset(1),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            decoration: BoxDecoration(
                              color: _selectedRoleIndex == 1 ? Colors.white : Colors.transparent,
                              borderRadius: BorderRadius.circular(9),
                              boxShadow: _selectedRoleIndex == 1
                                  ? [
                                      BoxShadow(
                                        color: Colors.black.withValues(alpha: 0.06),
                                        blurRadius: 4,
                                        offset: const Offset(0, 2),
                                      ),
                                    ]
                                  : null,
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.engineering,
                                  size: 16,
                                  color: _selectedRoleIndex == 1 ? AppColors.teal : AppColors.slate500,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'Field Inspector',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: _selectedRoleIndex == 1 ? FontWeight.bold : FontWeight.w600,
                                    color: _selectedRoleIndex == 1 ? AppColors.teal : AppColors.slate600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.cityBorder),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (_errorMessage != null)
                          Container(
                            padding: const EdgeInsets.all(12),
                            margin: const EdgeInsets.only(bottom: 16),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF2F2),
                              border: Border.all(color: const Color(0xFFFCA5A5)),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error_outline, color: AppColors.critical, size: 20),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _errorMessage!,
                                    style: const TextStyle(color: AppColors.critical, fontSize: 13),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: const InputDecoration(
                            labelText: 'Official Email / Account',
                            prefixIcon: Icon(Icons.mail_outline, size: 20),
                          ),
                          validator: (val) {
                            if (val == null || val.trim().isEmpty) return 'Email is required';
                            if (!val.contains('@')) return 'Enter a valid email address';
                            return null;
                          },
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: const Icon(Icons.lock_outline, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(
                                _obscurePassword ? Icons.visibility_off : Icons.visibility,
                                size: 20,
                              ),
                              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                            ),
                          ),
                          validator: (val) {
                            if (val == null || val.isEmpty) return 'Password is required';
                            return null;
                          },
                        ),
                        const SizedBox(height: 22),
                        ElevatedButton(
                          onPressed: _loading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _selectedRoleIndex == 1 ? AppColors.teal : AppColors.primary,
                            minimumSize: const Size.fromHeight(50),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: _loading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
                                )
                              : Text(
                                  _selectedRoleIndex == 1
                                      ? 'Sign In to Field Portal'
                                      : 'Sign In to Citizen Portal',
                                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                                ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('New Colombo citizen? ', style: TextStyle(color: AppColors.textGrey, fontSize: 13)),
                    TextButton(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const RegisterScreen()),
                        );
                      },
                      child: const Text(
                        'Register Account',
                        style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary, fontSize: 13),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
