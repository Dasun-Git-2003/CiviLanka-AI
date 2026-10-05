import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Wrench,
  FileClock,
  Users,
  ShieldCheck,
  CheckCircle2,
  Smartphone,
  ClipboardList,
  PlusCircle,
  Sparkles,
  LogOut,
  History,
  BarChart3,
  User,
  FileText,
  Bot,
  MapPin,
  ClipboardCheck,
  Wallet,
  ShieldAlert,
  Activity,
  Menu,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Theme & Language Support
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import ThemeToggle from './components/ThemeToggle';
import LanguageToggle from './components/LanguageToggle';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AccessDeniedPage from './pages/AccessDeniedPage';

// Citizen Portal Page
import CitizenDashboard from './pages/CitizenDashboard';
import CitizenReportsReviewPage from './pages/CitizenReportsReviewPage';

// Infrastructure Registry & Spatial Maps
import Dashboard from './pages/Dashboard';
import InfrastructureAssets from './pages/InfrastructureAssets';
import Contractors from './pages/Contractors';
import RepairHistory from './pages/RepairHistory';
import AgentEstimatorPage from './pages/AgentEstimatorPage';

// Work Orders & AI Triage
import { WorkOrderDashboard } from './pages/WorkOrderDashboard';
import { WorkOrderList } from './pages/WorkOrderList';
import { WorkOrderDetails } from './pages/WorkOrderDetails';
import { CreateWorkOrder } from './pages/CreateWorkOrder';
import { ApprovalQueue } from './pages/ApprovalQueue';

// Maintenance Records, Field Operations & Safety/Compliance AI
import { MaintenanceDashboard } from './pages/MaintenanceDashboard';
import { CreateMaintenanceRecord } from './pages/CreateMaintenanceRecord';
import { MaintenanceDetailsPage } from './pages/MaintenanceDetailsPage';
import { FieldInspectorPortal } from './pages/FieldInspectorPortal';
import { VerificationQueuePage } from './pages/VerificationQueuePage';
import { MaintenanceHistoryPage } from './pages/MaintenanceHistoryPage';

// Visual Analytics & User Management
import { VisualizationsPage } from './pages/VisualizationsPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { UserManagementPage } from './pages/UserManagementPage';
import { BudgetManagementPage } from './pages/BudgetManagementPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { HazardClassificationAIPage } from './pages/HazardClassificationAIPage';
import { AssetRiskAIPage } from './pages/AssetRiskAIPage';

// RBAC
import { ProtectedRoute } from './components/ProtectedRoute';
import { authService } from './services/authService';
import { normalizeRole, getRoleMeta } from './utils/rbac';

// Autonomous Municipal Operations & Audit
import SafetyAuditCenter from './pages/SafetyAuditCenter';

interface SidebarContentProps {
  onClose?: () => void;
  isMobile?: boolean;
}

function SidebarContent({ onClose, isMobile }: SidebarContentProps) {
  const location = useLocation();
  const user = authService.getCurrentUser();
  const role = normalizeRole(user?.role);
  const roleMeta = getRoleMeta(user?.role);
  const { isSinhala } = useLanguage();

  // Generate role-specific navigation sections
  const getNavSections = () => {
    if (role === 'Citizen') {
      return [
        {
          title: isSinhala ? 'පුරවැසි ද්වාරය' : 'Citizen Portal',
          items: [
            { name: isSinhala ? 'මගේ ද්වාරය සහ වාර්තා' : 'My Portal & Reports', path: '/citizen', icon: LayoutDashboard },
            { name: isSinhala ? 'නාගරික GIS සිතියම' : 'City GIS Map', path: '/dashboard', icon: MapPin },
            { name: isSinhala ? 'නගර ආරක්ෂණ විශ්ලේෂණ' : 'City Safety Analytics', path: '/analytics', icon: BarChart3 },
          ],
        },
        {
          title: isSinhala ? 'ගිණුම' : 'Account',
          items: [
            { name: isSinhala ? 'මගේ පැතිකඩ' : 'My Profile', path: '/profile', icon: User },
          ],
        },
      ];
    }

    if (role === 'FieldWorker') {
      return [
        {
          title: isSinhala ? 'ක්ෂේත්‍ර මෙහෙයුම්' : 'Field Operations',
          items: [
            { name: isSinhala ? 'ක්ෂේත්‍ර පරීක්ෂක ද්වාරය' : 'Field Inspector Portal', path: '/field-inspector', icon: Smartphone },
            { name: isSinhala ? 'පවරා ඇති වැඩ ඇණවුම්' : 'Assigned Work Orders', path: '/work-orders', icon: ClipboardList },
            { name: isSinhala ? 'නඩත්තු වාර්තා' : 'Maintenance Records', path: '/maintenance', icon: Wrench },
            { name: isSinhala ? 'වත්කම් GIS සිතියම' : 'Asset GIS Map', path: '/dashboard', icon: MapPin },
            { name: isSinhala ? 'නගර ආරක්ෂණ විශ්ලේෂණ' : 'City Safety Analytics', path: '/analytics', icon: BarChart3 },
          ],
        },
        {
          title: isSinhala ? 'ගිණුම' : 'Account',
          items: [
            { name: isSinhala ? 'මගේ පැතිකඩ' : 'My Profile', path: '/profile', icon: User },
          ],
        },
      ];
    }

    if (role === 'FieldMaintenanceSupervisor') {
      return [
        {
          title: isSinhala ? 'දළ විශ්ලේෂණය සහ විශ්ලේෂණ' : 'Overview & Analytics',
          items: [
            { name: isSinhala ? 'වත්කම් GIS සිතියම' : 'Asset GIS Map', path: '/dashboard', icon: MapPin },
            { name: isSinhala ? 'නගර ආරක්ෂණ විශ්ලේෂණ' : 'City Safety Analytics', path: '/analytics', icon: BarChart3 },
          ],
        },
        {
          title: isSinhala ? 'වැඩ ඇණවුම් සහ වර්ගීකරණය' : 'Work Orders & Triage',
          items: [
            { name: isSinhala ? 'පුරවැසි වාර්තා' : 'Citizen Reports', path: '/citizen-reports', icon: ClipboardCheck },
            { name: isSinhala ? 'වැඩ ඇණවුම් පුවරුව' : 'Work Orders Dashboard', path: '/work-orders-dashboard', icon: LayoutDashboard },
            { name: isSinhala ? 'සියලු වැඩ ඇණවුම්' : 'All Work Orders', path: '/work-orders', icon: ClipboardList },
            { name: isSinhala ? 'වැඩ ඇණවුමක් සාදන්න' : 'Create Work Order', path: '/work-orders/create', icon: PlusCircle },
          ],
        },
        {
          title: isSinhala ? 'ක්ෂේත්‍ර මෙහෙයුම් සහ අනුමැතිය' : 'Field Operations & Sign-Off',
          items: [
            { name: isSinhala ? 'ක්ෂේත්‍ර පරීක්ෂක ද්වාරය' : 'Field Inspector Portal', path: '/field-inspector', icon: Smartphone },
            { name: isSinhala ? 'නඩත්තු වාර්තා' : 'Maintenance Records', path: '/maintenance', icon: Wrench },
            { name: isSinhala ? 'නඩත්තු වාර්තාවක් සාදන්න' : 'Create Maintenance Record', path: '/maintenance/create', icon: PlusCircle },
            { name: isSinhala ? 'තහවුරු කිරීමේ පෝලිම' : 'Verification Queue', path: '/maintenance/verification', icon: CheckCircle2 },
            { name: isSinhala ? 'නඩත්තු ඉතිහාසය' : 'Maintenance History', path: '/maintenance/history', icon: History },
          ],
        },
        {
          title: isSinhala ? 'යටිතල පහසුකම් සහ වත්කම්' : 'Infrastructure & Assets',
          items: [
            { name: isSinhala ? 'යටිතල පහසුකම් වත්කම්' : 'Infrastructure Assets', path: '/assets', icon: Building2 },
            { name: isSinhala ? 'කොන්ත්‍රාත්කරුවන්ගේ නාමාවලිය' : 'Contractors Directory', path: '/contractors', icon: Users },
            { name: isSinhala ? 'අලුත්වැඩියා ඉතිහාසය' : 'Repair History', path: '/repairs', icon: FileClock },
          ],
        },
        {
          title: isSinhala ? 'ස්වාධීන AI මාදිලි' : 'Autonomous AI Models',
          items: [
            { name: isSinhala ? 'උපද්‍රව වර්ගීකරණ AI' : 'Hazard Classification AI', path: '/hazard-classification-ai', icon: Bot },
            { name: isSinhala ? 'වත්කම් අවදානම් අනාවැකි AI' : 'Asset Risk Prediction AI', path: '/asset-risk-ai', icon: Activity },
            { name: isSinhala ? 'පිරිවැය ඇස්තමේන්තුකරු AI' : 'Cost Estimator AI', path: '/agent-estimator', icon: Sparkles },
            { name: isSinhala ? 'ආරක්ෂණ අනුකූලතා AI විගණනය' : 'Safety Compliance AI Audit', path: '/audits', icon: ShieldAlert },
          ],
        },
        {
          title: isSinhala ? 'පාලනය සහ ලෙජරය' : 'Governance & Ledger',
          items: [
            { name: isSinhala ? 'මෙහෙයුම් අයවැය' : 'Operational Budget', path: '/budget', icon: Wallet },
            { name: isSinhala ? 'ආරක්ෂක විගණන ලේඛනය' : 'Security Audit Ledger', path: '/audit', icon: FileText },
          ],
        },
        {
          title: isSinhala ? 'ගිණුම' : 'Account',
          items: [
            { name: isSinhala ? 'මගේ පැතිකඩ' : 'My Profile', path: '/profile', icon: User },
          ],
        },
      ];
    }

    // PublicWorksDirector: Full Governance
    return [
      {
        title: isSinhala ? 'විධායක පාලනය' : 'Executive Governance',
        items: [
          { name: isSinhala ? 'වත්කම් GIS සිතියම' : 'Asset GIS Map', path: '/dashboard', icon: MapPin },
          { name: isSinhala ? 'අනුමැති පෝලිම' : 'Approval Queue', path: '/approval-queue', icon: ShieldCheck },
          { name: isSinhala ? 'පුරවැසි වාර්තා' : 'Citizen Reports', path: '/citizen-reports', icon: ClipboardCheck },
          { name: isSinhala ? 'නගර ආරක්ෂණ විශ්ලේෂණ' : 'City Safety Analytics', path: '/analytics', icon: BarChart3 },
          { name: isSinhala ? 'භාණ්ඩාගාරය සහ මෙහෙයුම් අයවැය' : 'Treasury & Operational Budget', path: '/budget', icon: Wallet },
        ],
      },
      {
        title: isSinhala ? 'වැඩ ඇණවුම් සහ වර්ගීකරණය' : 'Work Orders & Triage',
        items: [
          { name: isSinhala ? 'වැඩ ඇණවුම් පුවරුව' : 'Work Orders Dashboard', path: '/work-orders-dashboard', icon: LayoutDashboard },
          { name: isSinhala ? 'සියලු වැඩ ඇණවුම්' : 'All Work Orders', path: '/work-orders', icon: ClipboardList },
          { name: isSinhala ? 'වැඩ ඇණවුමක් සාදන්න' : 'Create Work Order', path: '/work-orders/create', icon: PlusCircle },
        ],
      },
      {
        title: isSinhala ? 'ක්ෂේත්‍ර මෙහෙයුම් සහ අනුමැතිය' : 'Field Operations & Sign-Off',
        items: [
          { name: isSinhala ? 'ක්ෂේත්‍ර පරීක්ෂක ද්වාරය' : 'Field Inspector Portal', path: '/field-inspector', icon: Smartphone },
          { name: isSinhala ? 'නඩත්තු වාර්තා' : 'Maintenance Records', path: '/maintenance', icon: Wrench },
          { name: isSinhala ? 'තහවුරු කිරීමේ පෝලිම' : 'Verification Queue', path: '/maintenance/verification', icon: CheckCircle2 },
          { name: isSinhala ? 'නඩත්තු ඉතිහාසය' : 'Maintenance History', path: '/maintenance/history', icon: History },
        ],
      },
      {
        title: isSinhala ? 'යටිතල පහසුකම් සහ වත්කම්' : 'Infrastructure & Assets',
        items: [
          { name: isSinhala ? 'යටිතල පහසුකම් වත්කම්' : 'Infrastructure Assets', path: '/assets', icon: Building2 },
          { name: isSinhala ? 'කොන්ත්‍රාත්කරුවන්ගේ නාමාවලිය' : 'Contractors Directory', path: '/contractors', icon: Users },
          { name: isSinhala ? 'අලුත්වැඩියා ඉතිහාසය' : 'Repair History', path: '/repairs', icon: FileClock },
        ],
      },
      {
        title: isSinhala ? 'ස්වාධීන AI ආකෘති' : 'Autonomous AI Models',
        items: [
          { name: isSinhala ? 'අනතුරු වර්ගීකරණ AI' : 'Hazard Classification AI', path: '/hazard-classification-ai', icon: Bot },
          { name: isSinhala ? 'වත්කම් අවදානම් අනාවැකි AI' : 'Asset Risk Prediction AI', path: '/asset-risk-ai', icon: Activity },
          { name: isSinhala ? 'AI පිරිවැය ඇස්තමේන්තුකරු' : 'Cost Estimator AI', path: '/agent-estimator', icon: Sparkles },
          { name: isSinhala ? 'ආරක්ෂණ අනුකූලතා AI විගණනය' : 'Safety Compliance AI Audit', path: '/audits', icon: ShieldAlert },
        ],
      },
      {
        title: isSinhala ? 'ආරක්ෂාව සහ පරිපාලනය' : 'Security & Administration',
        items: [
          { name: isSinhala ? 'ආරක්ෂක විගණන ලේඛනය' : 'Security Audit Ledger', path: '/audit', icon: FileText },
          { name: isSinhala ? 'පරිශීලක නාමාවලිය සහ ප්‍රවේශ පාලනය' : 'User Directory & Access Control', path: '/users', icon: Users },
          { name: isSinhala ? 'මගේ පැතිකඩ' : 'My Profile', path: '/profile', icon: User },
        ],
      },
    ];
  };

  const navSections = getNavSections();

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300 select-none">
      <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-amber-500" />
            CivitaGuard
          </h1>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleMeta.badgeClass}`}>
              {roleMeta.label}
            </span>
          </div>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-3 sm:p-4 space-y-5 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-3 mb-2 font-gis">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => onClose?.()}
                    className={twMerge(
                      clsx(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all',
                        isActive
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/25 active:scale-[0.98]'
                          : 'hover:bg-slate-800 hover:text-white text-slate-300'
                      )
                    )}
                  >
                    <item.icon className={twMerge('w-4 h-4 flex-shrink-0', isActive ? 'text-slate-950' : 'text-slate-400')} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px] font-mono uppercase text-amber-400/90">{role} {isSinhala ? 'සක්‍රීයයි' : 'ACTIVE'}</span>
        <button
          onClick={handleLogout}
          className="p-1.5 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
          title={isSinhala ? 'පිටවීම' : 'Sign Out'}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const location = useLocation();
  const user = authService.getCurrentUser();
  const roleMeta = getRoleMeta(user?.role);
  const { isSinhala } = useLanguage();

  // Close mobile drawer on route change
  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Close mobile drawer on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col md:flex-row">
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 border-r border-slate-800 select-none shrink-0 sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (visible when open) */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Dimmed backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Off-canvas sidebar */}
          <aside className="relative z-10 w-72 max-w-[85vw] bg-slate-900 shadow-2xl flex flex-col h-full border-r border-slate-800 animate-in slide-in-from-left duration-200">
            <SidebarContent isMobile onClose={() => setMobileSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden min-h-screen">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between transition-colors sticky top-0 z-30">
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              CivitaGuard AI
            </span>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">&bull;</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline truncate">
              {isSinhala ? 'නාගරික කළමනාකරණ කොන්සෝලය' : 'Municipal Management Console'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <LanguageToggle isScrolled={true} />
            <ThemeToggle />
            <span
              className={`text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border hidden sm:inline-flex ${roleMeta.badgeClass}`}
            >
              {roleMeta.label}
            </span>
            <Link
              to="/profile"
              className="flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isSinhala ? 'මගේ පැතිකඩ බලන්න සහ සංස්කරණය කරන්න' : 'View & Edit My Profile'}
            >
              <div className="w-7 h-7 bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs">
                {user?.fullName ? user.fullName[0].toUpperCase() : 'M'}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden md:inline">
                {user?.fullName || (isSinhala ? 'නාගරික පරිශීලක' : 'Municipal User')}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <Router>
        <Routes>
        {/* ── Public & Authenticated Core Routes ────────────────────────────── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/403" element={<AccessDeniedPage />} />

        {/* ── Citizen Portal ─────────────────────────────────────────────────── */}
        <Route
          path="/citizen"
          element={
            <ProtectedRoute allowedRoles={['Citizen', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <CitizenDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ── Infrastructure & Asset Registry ──────────────────────── */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Citizen', 'FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets"
          element={
            <ProtectedRoute allowedRoles={['FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <InfrastructureAssets />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contractors"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <Contractors />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/repairs"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <RepairHistory />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/agent-estimator"
          element={
            <ProtectedRoute allowedRoles={['FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <AgentEstimatorPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ── Work Orders & AI Triage ──────────────────────────────── */}
        <Route
          path="/work-orders-dashboard"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <WorkOrderDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/work-orders"
          element={
            <ProtectedRoute allowedRoles={['FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <WorkOrderList />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/work-orders/create"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <CreateWorkOrder />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/work-orders/:id"
          element={
            <ProtectedRoute allowedRoles={['FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <WorkOrderDetails />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/citizen-reports"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <CitizenReportsReviewPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/approval-queue"
          element={
            <ProtectedRoute allowedRoles={['PublicWorksDirector']}>
              <Layout>
                <ApprovalQueue />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ── Maintenance Records, Field Operations & Safety ───────── */}
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute allowedRoles={['FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <MaintenanceDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance/create"
          element={
            <ProtectedRoute allowedRoles={['FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <CreateMaintenanceRecord />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance/:id"
          element={
            <ProtectedRoute allowedRoles={['FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <MaintenanceDetailsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/field-inspector"
          element={
            <ProtectedRoute allowedRoles={['FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <FieldInspectorPortal />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/field-worker"
          element={
            <ProtectedRoute allowedRoles={['FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <FieldInspectorPortal />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance/verification"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <VerificationQueuePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/maintenance/history"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <MaintenanceHistoryPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ── Dedicated RBAC Modules: Budget, Audit, Multi-Agent AI ───────────── */}
        <Route
          path="/budget"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <BudgetManagementPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <AuditLogsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        {/* ── Dedicated AI Modules: Member 1, 2, 3, 4 ────────────────────── */}
        <Route
          path="/hazard-classification-ai"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <HazardClassificationAIPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/asset-risk-ai"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <AssetRiskAIPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/ai" element={<Navigate to="/hazard-classification-ai" replace />} />

        {/* ── Visual Analytics & Executive Intelligence ──────────────────────── */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute allowedRoles={['Citizen', 'FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <VisualizationsPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ── User Profile & Municipal Governance ─────────────────────────────── */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <UserProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['PublicWorksDirector']}>
              <Layout>
                <UserManagementPage />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ── Redirect legacy duplicate paths to canonical routes ────────────── */}
        <Route path="/approvals" element={<Navigate to="/approval-queue" replace />} />
        <Route path="/budgets" element={<Navigate to="/budget" replace />} />

        {/* ── Autonomous Municipal Operations & Audit ────────────────────────── */}
        <Route
          path="/audits"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <SafetyAuditCenter />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="/lifecycle" element={<Navigate to="/work-orders-dashboard" replace />} />
        <Route path="/field-simulator" element={<Navigate to="/field-inspector" replace />} />

        {/* Fallback to 403 or Home */}
        <Route path="*" element={<AccessDeniedPage />} />
      </Routes>
    </Router>
    </LanguageProvider>
  </ThemeProvider>
  );
}

export default App;
