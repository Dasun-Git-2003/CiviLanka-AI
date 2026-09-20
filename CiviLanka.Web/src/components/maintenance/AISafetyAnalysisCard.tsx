import React, { useState } from 'react';
import type { SafetyAnalysisResponse } from '../../types/maintenance';
import { SafetyRiskBadge } from './SafetyRiskBadge';
import { ComplianceBadge } from './ComplianceBadge';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  HardHat,
  CheckCircle,
  Clock,
  RotateCw,
  Info,
} from 'lucide-react';
import { maintenanceService } from '../../services/maintenanceService';

interface AISafetyAnalysisCardProps {
  maintenanceId: string;
  analysis?: SafetyAnalysisResponse | null;
  onAnalysisUpdated?: (newAnalysis: SafetyAnalysisResponse) => void;
  canTriggerAudit?: boolean;
}

export const AISafetyAnalysisCard: React.FC<AISafetyAnalysisCardProps> = ({
  maintenanceId,
  analysis,
  onAnalysisUpdated,
  canTriggerAudit = true,
}) => {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunAudit = async () => {
    try {
      setRunning(true);
      setError(null);
      const result = await maintenanceService.runSafetyAnalysis(maintenanceId);
      if (onAnalysisUpdated) {
        onAnalysisUpdated(result);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to execute AI safety audit.');
    } finally {
      setRunning(false);
    }
  };

  if (!analysis) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Safety &amp; Compliance AI Agent</h3>
              <p className="text-xs text-slate-500">
                Automated hazard risk assessment, PPE verification, and regulatory compliance audit
              </p>
            </div>
          </div>
          {canTriggerAudit && (
            <button
              onClick={handleRunAudit}
              disabled={running}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Analyzing Operation...' : 'Run Safety AI Audit'}
            </button>
          )}
        </div>
        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {error}
          </div>
        )}
        <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
          <Info className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs text-slate-600">No safety evaluation has been run yet for this record.</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Click the button above to run real-time AI compliance verification.</p>
        </div>
      </div>
    );
  }

  const confidencePct = Math.round((analysis.confidence || 0.85) * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-teal-50/40 to-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Safety &amp; Compliance AI Agent</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-mono font-medium">
                {analysis.agentName || 'Gemini 2.0 Flash'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Audited at {new Date(analysis.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SafetyRiskBadge level={analysis.safetyRiskLevel} />
          <ComplianceBadge status={analysis.complianceStatus} />
          {canTriggerAudit && (
            <button
              onClick={handleRunAudit}
              disabled={running}
              title="Re-run AI Analysis"
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-50 transition-colors"
            >
              <RotateCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="m-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* Body Grid */}
      <div className="p-6 space-y-6">
        {/* Recommendation & Reason */}
        <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                Supervisor Action Recommendation
              </h4>
              <p className="text-sm font-medium text-slate-800 leading-relaxed">
                {analysis.recommendation}
              </p>
              {analysis.reason && (
                <p className="text-xs text-slate-600 mt-1 italic">
                  &ldquo;{analysis.reason}&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3 Column Stats & Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Identified Risks */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Identified Safety Hazards
            </h4>
            {analysis.identifiedRisks && analysis.identifiedRisks.length > 0 ? (
              <ul className="space-y-2">
                {analysis.identifiedRisks.map((risk, i) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No elevated safety risks flagged.</p>
            )}
          </div>

          {/* Required Safety Actions / PPE */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
              <HardHat className="w-4 h-4 text-teal-600" />
              Required Safety Actions &amp; PPE
            </h4>
            {analysis.requiredSafetyActions && analysis.requiredSafetyActions.length > 0 ? (
              <ul className="space-y-2">
                {analysis.requiredSafetyActions.map((action, i) => (
                  <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-teal-600 mt-0.5 flex-shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Standard general PPE required.</p>
            )}
          </div>

          {/* Missing Requirements / Evidence */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-rose-500" />
              Missing Requirements &amp; Evidence
            </h4>
            {analysis.missingRequirements && analysis.missingRequirements.length > 0 ? (
              <ul className="space-y-2">
                {analysis.missingRequirements.map((missing, i) => (
                  <li key={i} className="text-xs text-rose-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
                    <span>{missing}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>All mandatory evidence &amp; checklist items complete.</span>
              </div>
            )}
          </div>
        </div>

        {/* Confidence Meter Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
          <span className="font-medium">Model Confidence Score:</span>
          <div className="flex items-center gap-3 w-48">
            <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${confidencePct}%` }}
              />
            </div>
            <span className="font-mono font-semibold text-slate-700">{confidencePct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
