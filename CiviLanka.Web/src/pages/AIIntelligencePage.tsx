import React, { useState } from 'react';
import {
  Bot,
  Cpu,
  CheckCircle2,
  Zap,
  Activity,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AIIntelligencePage: React.FC = () => {
  const [activeTab] = useState<'all' | 'triage' | 'gis' | 'cost' | 'safety'>('all');

  const agents = [
    {
      id: 'triage',
      number: 'Agent 01',
      name: 'Hazard Triage & Risk Scoring AI',
      model: 'Gemini 1.5 Pro & Vision',
      role: 'Member 1 Triage Agent',
      status: 'OPERATIONAL',
      accuracy: '98.4%',
      processedCount: '1,420 reports',
      avgLatency: '820ms',
      description:
        'Analyzes citizen hazard photos and descriptions, classifies infrastructure risk, assigns priority scores (1–5), and automatically calculates urgency based on traffic density and environmental conditions.',
      capabilities: [
        'Multi-modal image hazard classification',
        'Pothole depth & volume estimation',
        'Automated priority matrix assignment',
        'Duplicate hazard deduplication',
      ],
      link: '/work-orders-dashboard',
      linkText: 'View Hazard Triage Queue',
      badgeClass: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    },
    {
      id: 'gis',
      number: 'Agent 02',
      name: 'GIS Spatial Clustering & Hotspot AI',
      model: 'DBSCAN + Spatial Risk Engine',
      role: 'Member 2 Spatial Agent',
      status: 'OPERATIONAL',
      accuracy: '96.2%',
      processedCount: '38 clusters active',
      avgLatency: '140ms',
      description:
        'Computes spatial density matrices across Sri Lanka road grids (EPSG:4326), predicts structural deterioration clusters, and flags corridor failures before water pipes burst or bridges fail.',
      capabilities: [
        'Density-based spatial cluster detection',
        'Infrastructure vulnerability scoring',
        'Corridor-level repair bundling',
        'Geodetic proximity radius mapping',
      ],
      link: '/dashboard',
      linkText: 'Inspect GIS Spatial Map',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    {
      id: 'cost',
      number: 'Agent 03',
      name: 'Work Order Cost & Material Estimator AI',
      model: 'Gemini 1.5 Flash + Pricing Engine',
      role: 'Member 3 Estimator Agent',
      status: 'OPERATIONAL',
      accuracy: '94.8%',
      processedCount: '340 estimates',
      avgLatency: '650ms',
      description:
        'Generates Bill of Quantities (BOQ), estimates asphalt, concrete, piping, and labor costs in LKR, and determines whether work order costs exceed the Director Approval Threshold.',
      capabilities: [
        'Automated Material BOQ generation',
        'Sri Lankan municipal schedule of rates integration',
        'Director fiscal threshold flagger',
        'Contractor quote benchmark comparison',
      ],
      link: '/work-orders',
      linkText: 'View Work Order Estimates',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      id: 'safety',
      number: 'Agent 04',
      name: 'Field Operations Safety & Compliance AI',
      model: 'OSHA/CIDA Safety Compliance Mesh',
      role: 'Member 4 Safety Agent',
      status: 'OPERATIONAL',
      accuracy: '97.1%',
      processedCount: '215 records verified',
      avgLatency: '480ms',
      description:
        'Verifies field maintenance evidence, inspects PPE compliance (helmets, high-vis vests, trench shoring), and flags discrepancies between completed work and safety standards.',
      capabilities: [
        'Computer vision PPE verification on site photos',
        'Before/After repair completion validation',
        'CIDA safety code compliance audit',
        'Independent supervisor verification auditing',
      ],
      link: '/maintenance',
      linkText: 'Review Maintenance Safety Records',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
  ];

  const filtered = activeTab === 'all' ? agents : agents.filter((a) => a.id === activeTab);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-cyan-900 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-cyan-300">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>AUTONOMOUS MUNICIPAL INTELLIGENCE MESH</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            CivitaGuard Multi-Agent Intelligence Hub
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Four specialized AI agents operating synchronously to triage citizen reports, identify
            geographic hazard clusters, estimate material costs, and enforce field worker safety.
          </p>
        </div>
      </div>

      {/* ── Global Mesh Telemetry ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Agents</span>
            <Bot className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">4 / 4</div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% Mesh Health</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Inference Accuracy</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">96.6%</div>
          <div className="text-[11px] text-slate-500">Cross-agent weighted avg</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Inferences</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">2,013</div>
          <div className="text-[11px] text-slate-500">Hazard tickets processed</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Avg Latency</span>
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">522 ms</div>
          <div className="text-[11px] text-slate-500">P95 pipeline latency</div>
        </div>
      </div>

      {/* ── Agent Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((agent) => (
          <div
            key={agent.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 hover:border-slate-300 transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-cyan-700">
                    {agent.number} &bull; {agent.role}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">{agent.name}</h3>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${agent.badgeClass}`}
                >
                  {agent.status}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{agent.description}</p>

              {/* Specs */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Foundation</div>
                  <div className="font-semibold text-slate-800 text-[11px] truncate">
                    {agent.model}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Accuracy</div>
                  <div className="font-bold text-emerald-700 text-[11px]">{agent.accuracy}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Processed</div>
                  <div className="font-semibold text-slate-800 text-[11px]">
                    {agent.processedCount}
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Core Capabilities
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {agent.capabilities.map((cap, i) => (
                    <div
                      key={i}
                      className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
                      <span className="truncate">{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Link */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">P95: {agent.avgLatency}</span>
              <Link
                to={agent.link}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 hover:text-cyan-800 transition-colors"
              >
                <span>{agent.linkText}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIIntelligencePage;
