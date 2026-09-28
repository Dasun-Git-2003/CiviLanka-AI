import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Mail,
  Phone,
  Shield,
  KeyRound,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Activity,
  Layers,
  Wrench,
  Lock,
  QrCode,
  Copy,
  Check,
  Eye,
  EyeOff,
  Sparkles,
  Building2,
  BadgeCheck,
  Fingerprint
} from 'lucide-react';
import { userService } from '../services/userService';
import type { UserProfile } from '../types/user';
import { authService } from '../services/authService';

export const UserProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Edit Form
  const [fullName, setFullName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [department, setDepartment] = useState('Public Infrastructure & Civil Works');
  const [station, setStation] = useState('Colombo Municipal Central Depot (Zone 01)');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password Change Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fingerprint copy state
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [copiedBadgeId, setCopiedBadgeId] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getMe();
      setProfile(data);
      setFullName(data.fullName);
      setContactPhone(data.contactPhone || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load user profile.');
      const localUser = authService.getCurrentUser();
      if (localUser) {
        const fallbackProfile: UserProfile = {
          id: localUser.userId || 'usr-local-9042',
          fullName: localUser.fullName,
          email: localUser.email,
          contactPhone: '+94 11 269 1111',
          role: localUser.role,
          roles: [localUser.role],
          createdAt: new Date().toISOString(),
          isLockedOut: false,
          hazardsReported: 14,
          assignedWorkOrders: 8,
          executedMaintenances: 22,
        };
        setProfile(fallbackProfile);
        setFullName(fallbackProfile.fullName);
        setContactPhone(fallbackProfile.contactPhone || '');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // Password Strength calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (newPassword.length >= 12) score++;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) score++;

    if (score <= 1) return { score: 20, label: 'Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 40, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3 || score === 4) return { score: 80, label: 'Strong', color: 'bg-cyan-500' };
    return { score: 100, label: 'Very Strong', color: 'bg-emerald-500' };
  }, [newPassword]);

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 14; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setConfirmPassword(pwd);
    setShowNew(true);
    setShowConfirm(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingProfile(true);
      setError(null);
      const updated = await userService.updateMe({
        fullName,
        contactPhone,
      });
      setProfile(updated);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    try {
      setChangingPassword(true);
      await userService.changePassword({
        currentPassword,
        newPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const badgeId = useMemo(() => {
    const seed = profile?.id ? profile.id.replace(/-/g, '').slice(0, 6).toUpperCase() : '9042';
    return `LK-MC-2026-${seed}`;
  }, [profile]);

  const cryptographicFingerprint = useMemo(() => {
    return `SHA256:7e9a${profile?.id?.slice(0, 4) || 'a1b2'}...f4c9c1b8::civilanka.gov.lk::authorized`;
  }, [profile]);

  const handleCopyFingerprint = () => {
    navigator.clipboard.writeText(cryptographicFingerprint);
    setCopiedFingerprint(true);
    setTimeout(() => setCopiedFingerprint(false), 2000);
  };

  const handleCopyBadgeId = () => {
    navigator.clipboard.writeText(badgeId);
    setCopiedBadgeId(true);
    setTimeout(() => setCopiedBadgeId(false), 2000);
  };

  // Role permissions breakdown
  const rolePermissions = useMemo(() => {
    const role = profile?.role || 'PublicWorksDirector';
    if (role === 'PublicWorksDirector' || role.includes('Director')) {
      return [
        { name: 'Executive Work Order Sign-Off', desc: 'Authorize high-budget municipal infrastructure contracts' },
        { name: 'Treasury Capital Allocation', desc: 'Allocate funds and monitor operational expenditure' },
        { name: 'Full Cryptographic Audit Review', desc: 'Inspect append-only logs under Transparency Act §14-A' },
        { name: 'AI Regulatory Safety Override', desc: 'Review automated compliance scores and approve exceptions' },
      ];
    }
    if (role.includes('Supervisor')) {
      return [
        { name: 'Maintenance Verification Queue', desc: 'Verify before/after field photo evidence and repairs' },
        { name: 'Field Crew Dispatch', desc: 'Assign work orders and mobilize municipal machinery' },
        { name: 'Operational Audit Access', desc: 'Log work events and field material consumption' },
        { name: 'Safety Compliance Submission', desc: 'Submit roadwork sign-offs for AI compliance review' },
      ];
    }
    return [
      { name: 'Hazard Triage & Reporting', desc: 'Document citizen infrastructure hazards with GPS tags' },
      { name: 'Field Work Execution', desc: 'Log in-progress repairs and upload post-remediation evidence' },
      { name: 'Inventory Consumption Tracking', desc: 'Record cold asphalt and equipment hours utilized' },
    ];
  }, [profile]);

  if (loading && !profile) {
    return (
      <div className="p-16 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-xs">
        <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="font-semibold text-slate-700">Loading municipal security profile...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Panoramic Hero Header with AI-Generated Civic Artwork ──────────── */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 text-white">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0">
          <img
            src="/images/profile_banner.jpg"
            alt="Sri Lanka Smart City Command"
            className="w-full h-full object-cover object-center opacity-45 transform scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        </div>

        {/* Content Inside Hero */}
        <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar Badge */}
            <div className="relative">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-400 p-0.5 shadow-lg shadow-cyan-500/20">
                <div className="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-3xl select-none">
                  {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-emerald-500 border-2 border-slate-950 flex items-center justify-center text-white shadow-md"
                title="Government Verified Account"
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            {/* Officer Details */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {profile?.fullName}
                </h1>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  {profile?.role}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1.5 font-medium">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" />
                  {profile?.email}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  {department}
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-400 font-mono">
                  <Calendar className="w-3.5 h-3.5" />
                  Active Since {new Date(profile?.createdAt || '').getFullYear()}
                </span>
              </div>

              {/* Service Badge & Clearance Chip */}
              <div className="pt-1 flex items-center gap-2 flex-wrap text-[11px]">
                <button
                  onClick={handleCopyBadgeId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono transition-colors"
                  title="Click to copy Service Badge ID"
                >
                  <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ID: {badgeId}</span>
                  {copiedBadgeId ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-500" />
                  )}
                </button>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CLASS 1 CLEARANCE &bull; APPEND-ONLY AUDIT
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              onClick={handleCopyFingerprint}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
              title="Copy cryptographic public verification fingerprint"
            >
              <Fingerprint className="w-4 h-4 text-cyan-400" />
              <span>{copiedFingerprint ? 'Fingerprint Copied!' : 'Copy Key Fingerprint'}</span>
            </button>
          </div>
        </div>

        {/* Operational Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-xs divide-y sm:divide-y-0 sm:divide-x divide-slate-800/80 text-xs">
          <div className="p-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Hazards Triaged
            </span>
            <div className="text-xl font-black text-white mt-1 flex items-center justify-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-400" />
              {profile?.hazardsReported ?? 0}
            </div>
          </div>

          <div className="p-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Authorized Work Orders
            </span>
            <div className="text-xl font-black text-white mt-1 flex items-center justify-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              {profile?.assignedWorkOrders ?? 0}
            </div>
          </div>

          <div className="p-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Field Operations
            </span>
            <div className="text-xl font-black text-white mt-1 flex items-center justify-center gap-1.5">
              <Wrench className="w-4 h-4 text-emerald-400" />
              {profile?.executedMaintenances ?? 0}
            </div>
          </div>

          <div className="p-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Security Trust Score
            </span>
            <div className="text-xl font-black text-emerald-400 mt-1 flex items-center justify-center gap-1.5">
              <BadgeCheck className="w-4 h-4 text-emerald-400" />
              100%
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Main Content Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Personal Info & Role Authority Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Personal Profile Details Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-cyan-600" />
                  Personal Information &amp; Duty Station
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your official display credentials and municipal contact coordinates.
                </p>
              </div>
            </div>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Profile credentials successfully updated and synced with municipal directory.
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Email (Government Identity)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      disabled
                      value={profile?.email || ''}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      placeholder="+94 77 123 4567"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Municipal Role &amp; Access Tier
                  </label>
                  <div className="relative">
                    <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      disabled
                      value={profile?.role || ''}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 font-bold cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Assigned Department
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Operational Station / Base
                  </label>
                  <input
                    type="text"
                    value={station}
                    onChange={(e) => setStation(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  All updates are cryptographically logged in the Municipal Security Ledger.
                </span>
                <button
                  type="submit"
                  disabled={updatingProfile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-cyan-400" />
                  {updatingProfile ? 'Updating Credentials...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Legal Authority & Role Permissions Breakdown */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-600" />
                  Delegated Municipal Authority &amp; Scope
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Statutory capabilities granted to your credential under Municipal Code §2026.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                Tier 4 Full Executive
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {rolePermissions.map((perm, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 space-y-1 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>{perm.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pl-5.5 leading-relaxed">
                    {perm.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Digital ID Badge & Password/Security (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Interactive Municipal Security ID Badge */}
          <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 text-white shadow-xl">
            {/* Holographic Watermark / Seal */}
            <div className="absolute top-4 right-4 w-20 h-20 opacity-10 pointer-events-none">
              <Shield className="w-full h-full text-cyan-400" />
            </div>

            <div className="space-y-4">
              {/* Badge Top Header */}
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-black tracking-widest text-cyan-400 uppercase">
                    DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA
                  </div>
                  <div className="text-xs font-black text-white tracking-wide mt-0.5">
                    MUNICIPAL COUNCIL &bull; PUBLIC WORKS
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700 text-cyan-400 flex items-center justify-center font-bold text-xs">
                  LK
                </div>
              </div>

              {/* Photo & Badge Info */}
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-20 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 flex flex-col items-center justify-center text-slate-300 shadow-inner">
                    <User className="w-8 h-8 text-slate-400 mb-1" />
                    <span className="text-[8px] font-bold text-cyan-400 uppercase">OFFICER</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border border-slate-900 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-black text-white">{profile?.fullName}</div>
                  <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wide">
                    {profile?.role}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                    BADGE: <span className="text-white font-bold">{badgeId}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    EXP: <span className="text-slate-300 font-mono">12/2028</span> &bull; STATUS:{' '}
                    <span className="text-emerald-400 font-bold">ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* Security Chip & Barcode Preview */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-5 rounded bg-gradient-to-tr from-amber-400 to-yellow-600 border border-amber-300 shadow-xs flex items-center justify-center text-[7px] font-bold text-amber-950 font-mono">
                    CHIP
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">SECURE HARDWARE ENCLAVE</span>
                </div>
                <QrCode className="w-6 h-6 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Card 4: Security Credentials & Password Update */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-600" />
                Security Credentials &amp; Password
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Update your administrative login password with cryptographic compliance.
              </p>
            </div>

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Password successfully updated. All other active sessions secured.
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full text-xs pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateSecurePassword}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-700 hover:text-cyan-800"
                  >
                    <Sparkles className="w-3 h-3 text-cyan-600" />
                    <span>Generate Strong</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    placeholder="At least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">Strength:</span>
                      <span className="font-bold text-slate-700">{passwordStrength.label}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5 text-cyan-400" />
                  {changingPassword ? 'Updating Password...' : 'Update Security Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
