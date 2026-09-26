import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, AlertTriangle, ArrowRight, Loader2, ArrowLeft, Check } from 'lucide-react';
import { authService } from '../services/authService';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const role = 'Citizen';
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isPasswordStrong = hasMinLength && hasUppercase && hasNumber && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!isPasswordStrong) {
      setError('Please fulfill all password security criteria.');
      return;
    }

    if (!agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      const user = await authService.register({
        fullName,
        email,
        phone,
        password,
        role,
      });

      const target = authService.getRedirectPathForRole(user.role);
      navigate(target);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row select-none">
      {/* ── LEFT 50%: Colombo Night Building Top & Large Red Crane Visual Panel ─ */}
      <div className="relative md:w-1/2 h-72 md:h-auto overflow-hidden bg-slate-950">
        {/* Animated Background: Colombo Night Skyline from Rooftop with Red Crane */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=2400&q=90"
            alt="Colombo Night Building Top"
            className="w-full h-full object-cover filter brightness-[0.85] contrast-[1.1] animate-slow-pan"
          />
          {/* Overlay of Large Red Crane in Night Skyline */}
          <div className="absolute top-12 left-10 w-44 md:w-60 pointer-events-none drop-shadow-[0_15px_30px_rgba(220,38,38,0.4)] opacity-95">
            <img
              src="https://images.unsplash.com/photo-1568732165911-51cf4bfd9b7c?auto=format&fit=crop&w=800&q=85"
              alt="Large Red Crane"
              className="w-full h-auto object-contain rounded-xl"
            />
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 border border-red-500/40 text-[10px] font-mono text-red-300 font-bold backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>PORT CITY HARBOR CRANE &bull; SECTOR 01</span>
            </div>
          </div>
        </div>

        {/* Ambient Dark-to-Light Gradient Veil */}
        <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gis-grid-light opacity-30 pointer-events-none" />

        {/* Back Link */}
        <Link
          to="/"
          className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 text-xs font-semibold text-white backdrop-blur-md shadow-lg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        {/* Left Branding Overlay */}
        <div className="absolute bottom-10 left-8 right-8 z-20 space-y-3 text-white">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-cyan-300 bg-black/60 px-3 py-1 rounded-full border border-cyan-500/40 backdrop-blur-md shadow-xs">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span>COMMUNITY &bull; FIELD &bull; GOVERNANCE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Create Your Account
          </h2>

          <p className="text-sm sm:text-base text-slate-300 font-normal max-w-md leading-relaxed">
            The municipal intelligence mesh connecting citizens, engineering crews, and public works directors.
          </p>

          <div className="pt-2 flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>NOCTURNAL TELEMETRY ACTIVE</span>
            <span>&bull;</span>
            <span className="text-emerald-400 font-bold">EPSG:4326 / WGS84</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT 50%: Registration Interface ──────────────────────────────── */}
      <div className="md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white overflow-y-auto">
        <div className="max-w-md w-full space-y-6 py-6">
          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Create Your CivitaGuard Account
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Join the platform for smarter infrastructure management.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Type Locked to Citizen */}
            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-900 uppercase font-gis">
                  Account Type
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Citizen Community Member
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Public registration is strictly for citizen hazard reporting. Operational crew, supervisory, and directorial accounts are provisioned internally by the Public Works Directorate.
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 font-gis">
                FULL NAME
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Kamal Perera"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 focus:border-cyan-600 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans shadow-2xs"
              />
            </div>

            {/* Email & Phone Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-gis">
                  EMAIL
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 focus:border-cyan-600 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 font-gis">
                  PHONE NUMBER
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="077-123-4567"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 focus:border-cyan-600 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans shadow-2xs"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 font-gis">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-white border border-slate-300 focus:border-cyan-600 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Requirements Badges */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 text-[10px] font-gis text-slate-500">
                <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-700 font-bold' : ''}`}>
                  <Check className={`w-3 h-3 ${hasMinLength ? 'text-emerald-600' : 'text-slate-400'}`} />
                  8+ characters
                </span>
                <span className={`flex items-center gap-1 ${hasUppercase ? 'text-emerald-700 font-bold' : ''}`}>
                  <Check className={`w-3 h-3 ${hasUppercase ? 'text-emerald-600' : 'text-slate-400'}`} />
                  Uppercase letter
                </span>
                <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-700 font-bold' : ''}`}>
                  <Check className={`w-3 h-3 ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`} />
                  Number
                </span>
                <span className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-700 font-bold' : ''}`}>
                  <Check className={`w-3 h-3 ${hasSpecial ? 'text-emerald-600' : 'text-slate-400'}`} />
                  Special character
                </span>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 font-gis">
                CONFIRM PASSWORD
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 focus:border-cyan-600 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans shadow-2xs"
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start pt-1">
              <input
                id="agree-terms"
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 mt-0.5"
              />
              <label htmlFor="agree-terms" className="ml-2 block text-xs text-slate-600 leading-snug">
                I agree to the <span className="text-cyan-700 font-semibold hover:underline">Terms of Service</span> and{' '}
                <span className="text-cyan-700 font-semibold hover:underline">Privacy Policy</span>.
              </label>
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-cyan-600/20 hover:shadow-cyan-600/35 disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Switcher */}
          <div className="text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-700 font-bold hover:underline ml-1">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
