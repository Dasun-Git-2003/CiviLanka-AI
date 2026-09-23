import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Wrench,
  FileClock,
  Users,
  ClipboardList,
  ShieldCheck,
  PlusCircle,
  Sparkles,
  LogOut,
  Smartphone,
  History,
  BarChart3,
  User,
  DollarSign,
  FileText,
  Bot,
  MapPin,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Theme Support
import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';

// Public Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AccessDeniedPage from './pages/AccessDeniedPage';

// Citizen Portal Page
import CitizenDashboard from './pages/CitizenDashboard';

// Member 2 Pages (Infrastructure Registry & Maps)
import Dashboard from './pages/Dashboard';
import InfrastructureAssets from './pages/InfrastructureAssets';
import Contractors from './pages/Contractors';
import RepairHistory from './pages/RepairHistory';
import AgentEstimatorPage from './pages/AgentEstimatorPage';

// Member 3 Pages (Work Orders & AI Triage)
import { WorkOrderDashboard } from './pages/WorkOrderDashboard';
import { WorkOrderList } from './pages/WorkOrderList';
import { WorkOrderDetails } from './pages/WorkOrderDetails';
import { CreateWorkOrder } from './pages/CreateWorkOrder';
import { ApprovalQueue } from './pages/ApprovalQueue';

// Member 4 Pages (Maintenance Records, Field Operations & Safety/Compliance AI)
import { MaintenanceDashboard } from './pages/MaintenanceDashboard';
import { CreateMaintenanceRecord } from './pages/CreateMaintenanceRecord';
import { MaintenanceDetailsPage } from './pages/MaintenanceDetailsPage';
import { FieldWorkerPortal } from './pages/FieldWorkerPortal';
import { VerificationQueuePage } from './pages/VerificationQueuePage';
import { MaintenanceHistoryPage } from './pages/MaintenanceHistoryPage';

// Visual Analytics & User Management
import { VisualizationsPage } from './pages/VisualizationsPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { UserManagementPage } from './pages/UserManagementPage';
import { BudgetManagementPage } from './pages/BudgetManagementPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { AIIntelligencePage } from './pages/AIIntelligencePage';

// RBAC
import { ProtectedRoute } from './components/ProtectedRoute';
import { authService } from './services/authService';
import { normalizeRole, getRoleMeta } from './utils/rbac';

function Sidebar() {
  const location = useLocation();
  const user = authService.getCurrentUser();
  const role = normalizeRole(user?.role);
  const roleMeta = getRoleMeta(user?.role);

  // Generate role-specific navigation sections
  const getNavSections = () => {
    if (role === 'Citizen') {
      return [
        {
          title: 'Citizen Portal',
          items: [
            { name: 'My Portal & Reports', path: '/citizen', icon: LayoutDashboard },
            { name: 'City GIS Map', path: '/dashboard', icon: MapPin },
            { name: 'City Safety Analytics', path: '/analytics', icon: BarChart3 },
          ],
        },
        {
          title: 'Account',
          items: [
            { name: 'My Profile', path: '/profile', icon: User },
          ],
        },
      ];
    }

    if (role === 'FieldWorker') {
      return [
        {
          title: 'Field Operations',
          items: [
            { name: 'Worker Task Portal', path: '/field-worker', icon: Smartphone },
            { name: 'Assigned Work Orders', path: '/work-orders', icon: ClipboardList },
            { name: 'Maintenance Records', path: '/maintenance', icon: Wrench },
            { name: 'Asset GIS Map', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Visual Analytics', path: '/analytics', icon: BarChart3 },
          ],
        },
        {
          title: 'Account',
          items: [
            { name: 'My Profile', path: '/profile', icon: User },
          ],
        },
      ];
    }

    if (role === 'FieldMaintenanceSupervisor') {
      return [
        {
          title: 'Navigation',
          items: [
            { name: 'Asset GIS Map', path: '/dashboard', icon: LayoutDashboard },
            { name: 'Visual Analytics', path: '/analytics', icon: BarChart3 },
          ],
        },
        {
          title: 'Infrastructure (M2)',
          items: [
            { name: 'Infrastructure Assets', path: '/assets', icon: Building2 },
            { name: 'Contractors', path: '/contractors', icon: Users },
            { name: 'Repair History', path: '/repairs', icon: FileClock },
            { name: 'AI Cost Estimator (RAG)', path: '/agent-estimator', icon: Sparkles },
          ],
        },
        {
          title: 'Work Orders & AI Triage (M3)',
          items: [
            { name: 'WO Dashboard', path: '/work-orders-dashboard', icon: Sparkles },
            { name: 'All Work Orders', path: '/work-orders', icon: ClipboardList },
            { name: 'Create Work Order', path: '/work-orders/create', icon: PlusCircle },
          ],
        },
        {
          title: 'Field Operations & Safety (M4)',
          items: [
            { name: 'Maintenance Records', path: '/maintenance', icon: Wrench },
            { name: 'Create Record', path: '/maintenance/create', icon: PlusCircle },
            { name: 'Verification Queue', path: '/maintenance/verification', icon: ShieldCheck },
            { name: 'Maintenance History', path: '/maintenance/history', icon: History },
            { name: 'Field Worker Portal', path: '/field-worker', icon: Smartphone },
          ],
        },
        {
          title: 'Executive & AI Hub',
          items: [
            { name: 'Operational Budget', path: '/budget', icon: DollarSign },
            { name: 'AI Intelligence Hub', path: '/ai', icon: Bot },
            { name: 'Audit Logs', path: '/audit', icon: FileText },
          ],
        },
        {
          title: 'Account',
          items: [
            { name: 'My Profile', path: '/profile', icon: User },
          ],
        },
      ];
    }

    // PublicWorksDirector: Full Governance
    return [
      {
        title: 'Executive Governance',
        items: [
          { name: 'Asset GIS Map', path: '/dashboard', icon: LayoutDashboard },
          { name: 'Approval Queue', path: '/approval-queue', icon: ShieldCheck },
          { name: 'Treasury Budget', path: '/budget', icon: DollarSign },
          { name: 'User Management', path: '/users', icon: Users },
          { name: 'Security Audit Ledger', path: '/audit', icon: FileText },
          { name: 'AI Intelligence Hub', path: '/ai', icon: Bot },
          { name: 'City Analytics', path: '/analytics', icon: BarChart3 },
        ],
      },
      {
        title: 'Infrastructure (M2)',
        items: [
          { name: 'Infrastructure Assets', path: '/assets', icon: Building2 },
          { name: 'Contractors', path: '/contractors', icon: Users },
          { name: 'Repair History', path: '/repairs', icon: FileClock },
          { name: 'AI Cost Estimator (RAG)', path: '/agent-estimator', icon: Sparkles },
        ],
      },
      {
        title: 'Work Orders & AI Triage (M3)',
        items: [
          { name: 'WO Dashboard', path: '/work-orders-dashboard', icon: Sparkles },
          { name: 'All Work Orders', path: '/work-orders', icon: ClipboardList },
          { name: 'Create Work Order', path: '/work-orders/create', icon: PlusCircle },
        ],
      },
      {
        title: 'Field Operations & Safety (M4)',
        items: [
          { name: 'Maintenance Records', path: '/maintenance', icon: Wrench },
          { name: 'Create Record', path: '/maintenance/create', icon: PlusCircle },
          { name: 'Verification Queue', path: '/maintenance/verification', icon: ShieldCheck },
          { name: 'Maintenance History', path: '/maintenance/history', icon: History },
          { name: 'Field Worker Portal', path: '/field-worker', icon: Smartphone },
        ],
      },
      {
        title: 'Administration',
        items: [
          { name: 'My Profile', path: '/profile', icon: User },
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
    <div className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col border-r border-slate-800 select-none">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary-500" />
          CivitaGuard
        </h1>
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleMeta.badgeClass}`}>
            {roleMeta.label}
          </span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title}>
            <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-3 mb-2">
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
                    className={twMerge(
                      clsx(
                        'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-primary-600 text-white font-semibold shadow-xs'
                          : 'hover:bg-slate-800 hover:text-white'
                      )
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px] font-mono uppercase">{role} ACTIVE</span>
        <button
          onClick={handleLogout}
          className="p-1.5 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const user = authService.getCurrentUser();
  const roleMeta = getRoleMeta(user?.role);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3.5 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">CivitaGuard AI</span>
            <span className="text-slate-300 dark:text-slate-600">&bull;</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Municipal Management Console</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${roleMeta.badgeClass}`}
            >
              {roleMeta.label}
            </span>
            <Link
              to="/profile"
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="View & Edit My Profile"
            >
              <div className="w-7 h-7 bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-full flex items-center justify-center font-bold text-xs">
                {user?.fullName ? user.fullName[0].toUpperCase() : 'M'}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">
                {user?.fullName || 'Municipal User'}
              </span>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
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

        {/* ── Infrastructure & Asset Registry (Member 2) ──────────────────────── */}
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

        {/* ── Work Orders & AI Triage (Member 3) ──────────────────────────────── */}
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
          path="/approval-queue"
          element={
            <ProtectedRoute allowedRoles={['PublicWorksDirector']}>
              <Layout>
                <ApprovalQueue />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* ── Maintenance Records, Field Operations & Safety (Member 4) ───────── */}
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
          path="/field-worker"
          element={
            <ProtectedRoute allowedRoles={['FieldWorker', 'FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <FieldWorkerPortal />
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
        <Route
          path="/ai"
          element={
            <ProtectedRoute allowedRoles={['FieldMaintenanceSupervisor', 'PublicWorksDirector']}>
              <Layout>
                <AIIntelligencePage />
              </Layout>
            </ProtectedRoute>
          }
        />

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

        {/* Fallback to 403 or Home */}
        <Route path="*" element={<AccessDeniedPage />} />
      </Routes>
    </Router>
  </ThemeProvider>
  );
}

export default App;
