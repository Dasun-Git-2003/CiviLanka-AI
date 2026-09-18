import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Wrench,
  FileClock,
  Users,
  FileCheck,
  Coins,
  ShieldCheck,
  GitBranch,
  Smartphone,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Member 2 Pages
import Dashboard from './pages/Dashboard';
import InfrastructureAssets from './pages/InfrastructureAssets';
import Contractors from './pages/Contractors';
import RepairHistory from './pages/RepairHistory';

// Member 4 Pages (Maintenance Operations & Audit)
import DirectorApprovals from './pages/DirectorApprovals';
import BudgetManagement from './pages/BudgetManagement';
import SafetyAuditCenter from './pages/SafetyAuditCenter';
import WorkOrderLifecycle from './pages/WorkOrderLifecycle';
import FieldWorkerSimulator from './pages/FieldWorkerSimulator';

function Sidebar() {
  const location = useLocation();

  const m2NavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Infrastructure Assets', path: '/assets', icon: Building2 },
    { name: 'Contractors', path: '/contractors', icon: Users },
    { name: 'Repair History', path: '/repairs', icon: FileClock },
  ];

  const m4NavItems = [
    { name: 'Director Approvals', path: '/approvals', icon: FileCheck, badge: 'M4' },
    { name: 'Budget Operations', path: '/budgets', icon: Coins, badge: 'M4' },
    { name: 'Safety & Audit Agent', path: '/audits', icon: ShieldCheck, badge: 'AI' },
    { name: 'Work Order Lifecycle', path: '/lifecycle', icon: GitBranch, badge: '8-State' },
    { name: 'Field Worker Simulator', path: '/field-simulator', icon: Smartphone, badge: 'Flutter' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary-500" />
          CivitaGuard AI
        </h1>
        <p className="text-xs text-slate-500 mt-1">Municipal Operations</p>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Member 2 Domain */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 px-3 tracking-wider block mb-1">
            Infrastructure & Assets (M2)
          </span>
          <nav className="space-y-1">
            {m2NavItems.map((item) => {
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
                        ? 'bg-primary-600 text-white'
                        : 'hover:bg-slate-800 hover:text-white'
                    )
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Member 4 Domain */}
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-500 px-3 tracking-wider block mb-1">
            Operations & Audit (M4)
          </span>
          <nav className="space-y-1">
            {m4NavItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={twMerge(
                    clsx(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'hover:bg-slate-800 hover:text-white'
                    )
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-600">
            CivitaGuard AI — Municipal Operations & Governance System
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-primary-100 text-primary-800 text-xs font-bold rounded-full">
              M2: Assets
            </span>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
              M4: Audit & Ops
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          {/* Member 2 Routes */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/assets" element={<InfrastructureAssets />} />
          <Route path="/contractors" element={<Contractors />} />
          <Route path="/repairs" element={<RepairHistory />} />

          {/* Member 4 Routes */}
          <Route path="/approvals" element={<DirectorApprovals />} />
          <Route path="/budgets" element={<BudgetManagement />} />
          <Route path="/audits" element={<SafetyAuditCenter />} />
          <Route path="/lifecycle" element={<WorkOrderLifecycle />} />
          <Route path="/field-simulator" element={<FieldWorkerSimulator />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
