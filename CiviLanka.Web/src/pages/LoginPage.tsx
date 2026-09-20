import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, AlertTriangle, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await authService.login({ email, password });
      const target = authService.getRedirectPathForRole(user.role);
      navigate(target);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your municipal credentials.');
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
              <span>RED CRANE AST-CR-09 &bull; 360° ROTATION ACTIVE</span>
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
            <span>COLOMBO NIGHT INFRASTRUCTURE PLATFORM</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            CivitaGuard AI
          </h2>

          <p className="text-sm sm:text-base text-slate-300 font-normal max-w-md leading-relaxed">
            Autonomous Municipal Triage &amp;
            <br />
            <span className="font-bold text-cyan-400">24/7 Citywide Infrastructure Safety.</span>
          </p>

          <div className="pt-2 flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>NOCTURNAL TELEMETRY</span>
            <span>&bull;</span>
            <span className="text-emerald-400 font-bold">EPSG:4326 / WGS84</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT 50%: Clean White Form Panel ──────────────────────────────── */}
      <div className="md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-normal">
              Sign in to your CivitaGuard AI account.
            </p>
          </div>

          {/* Error Alert (Reserved Amber/Red for errors) */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 font-gis">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@municipality.gov.lk"
                className="w-full px-4 py-3 rounded-lg bg-white border border-slate-300 focus:border-cyan-600 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans shadow-2xs"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 font-gis">
                  PASSWORD
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset link will be sent to your registered municipal email address.');
                  }}
                  className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  className="w-full pl-4 pr-11 py-3 rounded-lg bg-white border border-slate-300 focus:border-cyan-600 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-600 font-medium">
                Remember this workstation for 30 days
              </label>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-cyan-600/20 hover:shadow-cyan-600/35 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-[10px] font-gis uppercase">
                <span className="bg-white px-3 text-slate-400 font-bold">OR</span>
              </div>
            </div>

            {/* Google Authentication */}
            <button
              type="button"
              onClick={() => {
                alert('Google SSO for Municipalities is configured via SAML / OpenID Connect.');
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 transition-colors flex items-center justify-center gap-2 shadow-2xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.7 0 3 .6 4 1.5l3-3C17.2 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              <span>Continue with Municipal Google ID</span>
            </button>
          </form>

          {/* Bottom Switcher */}
          <div className="text-center pt-2 text-xs text-slate-600">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-cyan-700 font-bold hover:underline ml-1">
              Create an account
            </Link>
          </div>

          {/* Quick Demo Test Accounts for RBAC */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-gis text-center">
              Quick Test Credentials &bull; 4 RBAC Roles
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmail('citizen@test.com');
                  setPassword('Director123!');
                }}
                className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-left transition-colors"
              >
                <div className="font-bold text-[11px]">1. Citizen</div>
                <div className="text-[10px] text-emerald-600 truncate">citizen@test.com</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('fieldworker@test.com');
                  setPassword('Director123!');
                }}
                className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-left transition-colors"
              >
                <div className="font-bold text-[11px]">2. Field Worker</div>
                <div className="text-[10px] text-amber-600 truncate">fieldworker@test.com</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('supervisor@test.com');
                  setPassword('Director123!');
                }}
                className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-left transition-colors"
              >
                <div className="font-bold text-[11px]">3. Supervisor</div>
                <div className="text-[10px] text-blue-600 truncate">supervisor@test.com</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('director@test.com');
                  setPassword('Director123!');
                }}
                className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-left transition-colors"
              >
                <div className="font-bold text-[11px]">4. PW Director</div>
                <div className="text-[10px] text-purple-600 truncate">director@test.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
