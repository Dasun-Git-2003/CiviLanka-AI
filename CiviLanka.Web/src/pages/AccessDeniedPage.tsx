import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldAlert, LogOut, Home, Lock, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { getRedirectPathForRole, getRoleMeta } from '../utils/rbac';

export const AccessDeniedPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const roleMeta = getRoleMeta(user?.role);

  const state = location.state as {
    attemptedPath?: string;
    requiredRoles?: string[];
    requiredPermission?: string;
  } | null;

  const attemptedPath = state?.attemptedPath || location.pathname;
  const requiredRoles = state?.requiredRoles;

  const handleReturnHome = () => {
    if (user) {
      navigate(getRedirectPathForRole(user.role));
    } else {
      navigate('/');
    }
  };

  const handleSwitchAccount = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 text-slate-900 select-none">
      <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Daylight Banner */}
        <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-rose-500/10 p-6 border-b border-red-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shadow-xs flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-red-100 text-red-700 border border-red-200">
              <Lock className="w-3 h-3" />
              <span>HTTP 403 &bull; RESTRICTED ACCESS</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Municipal Authorization Required
            </h1>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            You do not have the clearance required to view this operational zone or execute this administrative action. CivitaGuard AI enforces strict Role-Based Access Control (RBAC) to ensure infrastructure integrity, public privacy, and procurement compliance.
          </p>

          {/* Identity Card */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Current Session Clearance
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-semibold text-slate-800 text-sm">
                  {user?.fullName || 'Unauthenticated Guest'}
                </div>
                <div className="text-xs text-slate-500">{user?.email || 'No email attached'}</div>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${roleMeta.badgeClass}`}
              >
                {roleMeta.label}
              </span>
            </div>
          </div>

          {/* Diagnostic Context */}
          {attemptedPath && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div>
                  <span className="font-semibold">Attempted Route: </span>
                  <code className="bg-amber-100/70 px-1.5 py-0.5 rounded text-amber-900 font-mono text-[11px]">
                    {attemptedPath}
                  </code>
                </div>
                {requiredRoles && requiredRoles.length > 0 && (
                  <div>
                    <span className="font-semibold">Required Role(s): </span>
                    <span className="font-medium text-amber-900">
                      {requiredRoles.join(' or ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleReturnHome}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-semibold text-xs tracking-wide uppercase transition-all shadow-md shadow-cyan-700/20"
            >
              <Home className="w-4 h-4" />
              <span>Return to My Workspace</span>
            </button>
            <button
              onClick={handleSwitchAccount}
              className="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs transition-colors"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>Sign In with Different Role</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-400">
          CivitaGuard AI Municipal Governance Mesh &bull; Security Logged
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
