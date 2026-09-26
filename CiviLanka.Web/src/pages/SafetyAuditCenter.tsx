import { useState } from 'react';
import {
  ShieldCheck,
  Play,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { INITIAL_AUDIT_LOGS, INITIAL_WORK_ORDERS, type AuditLog } from '../data/member4Data';

export default function SafetyAuditCenter() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('106');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [latestAgentResponse, setLatestAgentResponse] = useState<any | null>(null);

  const handleRunAgent = () => {
    setIsEvaluating(true);
    setLatestAgentResponse(null);

    setTimeout(() => {
      const order = INITIAL_WORK_ORDERS.find((w) => w.id === Number(selectedOrderId));
      if (!order) {
        setIsEvaluating(false);
        return;
      }

      // Proximity check: compare coordinates (Haversine simulation)
      let isGpsPass = true;
      let gpsDistance = 12.4;
      const violations: string[] = [];

      if (order.id === 109) {
        // Known demo failure: 2.3km off
        isGpsPass = false;
        gpsDistance = 2320.0;
        violations.push(
          'GPS location violation: Field completion recorded 2320m away from incident pin (Exceeds 50m municipal tolerance).'
        );
        violations.push(
          'Budget overrun violation: Actual expenditure exceeded approved ceiling by 50%.'
        );
      }

      const compliance = violations.length === 0 ? 'PASS' : 'FAILED';
      const approvalRequired = order.estimated_cost > 1000 || order.is_arterial_road;
      const reason =
        compliance === 'PASS'
          ? 'Estimated cost or arterial status required approval; Director sign-off and all field safety verifications passed.'
          : violations.join(' | ');

      const response = {
        compliance,
        approval_required: approvalRequired,
        reason,
        details: {
          work_order_id: order.id,
          gps_distance_meters: gpsDistance,
          gps_verified: isGpsPass,
          safety_rules_passed: compliance === 'PASS',
          budget_threshold_passed: compliance === 'PASS',
          violations,
        },
      };

      setLatestAgentResponse(response);

      // Add to audit logs ledger
      const newAudit: AuditLog = {
        id: auditLogs.length ? Math.max(...auditLogs.map((a) => a.id)) + 1 : 1,
        work_order_id: order.id,
        compliance_status: compliance as 'PASS' | 'FAILED',
        approval_required: approvalRequired,
        safety_rules_passed: compliance === 'PASS',
        budget_threshold_passed: compliance === 'PASS',
        gps_verified: isGpsPass,
        gps_distance_meters: gpsDistance,
        before_photo_url: order.before_photo,
        after_photo_url: order.after_photo,
        materials_verified: true,
        violations_json: violations,
        ai_reasoning: `Municipal Safety & Audit Agent verdict: ${compliance}. ${reason}`,
        audited_at: new Date().toISOString(),
      };

      setAuditLogs([newAudit, ...auditLogs]);
      setIsEvaluating(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Municipal Safety & Audit Agent</h1>
              <p className="text-sm text-slate-500">
                Agentic AI Ownership: <strong>Member 4</strong> (Maintenance Operations & Audit)
              </p>
            </div>
          </div>
        </div>

        <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-full flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          Autonomous Agent Engine Active
        </span>
      </div>

      {/* Agent Evaluation Console */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Trigger Municipal Safety & Audit Agent</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            className="w-full sm:max-w-md px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-primary-500"
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
          >
            {INITIAL_WORK_ORDERS.map((w) => (
              <option key={w.id} value={w.id}>
                WO #{w.id} - {w.title} ({w.status})
              </option>
            ))}
          </select>

          <button
            onClick={handleRunAgent}
            disabled={isEvaluating}
            className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <Play className="w-3.5 h-3.5" />
            {isEvaluating ? 'Agent Evaluating Safety Rules...' : 'Execute Municipal AI Audit'}
          </button>
        </div>

        {/* Live Structured Response Display */}
        {latestAgentResponse && (
          <div
            className={`p-4 rounded-xl border ${
              latestAgentResponse.compliance === 'PASS'
                ? 'bg-emerald-50/50 border-emerald-200'
                : 'bg-red-50/50 border-red-200'
            } space-y-3`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-md flex items-center gap-1 ${
                    latestAgentResponse.compliance === 'PASS'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {latestAgentResponse.compliance === 'PASS' ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  Agent Verdict: {latestAgentResponse.compliance}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded">
                  Approval Required: {latestAgentResponse.approval_required ? 'TRUE' : 'FALSE'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Structured JSON Output</span>
            </div>

            {/* Code Block */}
            <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg text-xs font-mono overflow-x-auto">
              {JSON.stringify(
                {
                  compliance: latestAgentResponse.compliance,
                  approval_required: latestAgentResponse.approval_required,
                  reason: latestAgentResponse.reason,
                },
                null,
                2
              )}
            </pre>

            <p className="text-xs text-slate-700">
              <strong>Reasoning:</strong> {latestAgentResponse.reason}
            </p>

            {latestAgentResponse.details.violations.length > 0 && (
              <div className="p-3 bg-red-100/70 border border-red-200 rounded-lg text-xs text-red-800 space-y-1">
                <p className="font-bold">Violations Detected:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {latestAgentResponse.details.violations.map((v: string, i: number) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historical Audit Logs Grid */}
      <h3 className="text-base font-bold text-slate-800">
        Audit Logs Ledger (Entity: Member 4)
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {auditLogs.map((audit) => {
          const isPass = audit.compliance_status === 'PASS';
          return (
            <div
              key={audit.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-md flex items-center gap-1 ${
                      isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {isPass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {audit.compliance_status}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded">
                    Audit #{audit.id}
                  </span>
                  <span className="px-2 py-0.5 bg-primary-100 text-primary-800 text-xs font-semibold rounded">
                    WO #{audit.work_order_id}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {new Date(audit.audited_at).toLocaleDateString()}
                </span>
              </div>

              {/* Checks */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">GPS Geofence</span>
                  <span className={`font-bold ${audit.gps_verified ? 'text-emerald-600' : 'text-red-600'}`}>
                    {audit.gps_distance_meters !== null ? `${audit.gps_distance_meters}m offset` : 'No GPS'}
                    {audit.gps_verified ? ' (PASS <=50m)' : ' (VIOLATION)'}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Photo Evidence</span>
                  <span className="font-bold text-emerald-600">
                    {audit.before_photo_url && audit.after_photo_url ? 'Both Valid' : 'Missing Photo'}
                  </span>
                </div>
              </div>

              {/* Before & After Photo Preview */}
              {audit.before_photo_url && audit.after_photo_url && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      Before Repair
                    </span>
                    <img
                      src={audit.before_photo_url}
                      alt="Before"
                      className="w-full h-24 object-cover rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                      After Repair
                    </span>
                    <img
                      src={audit.after_photo_url}
                      alt="After"
                      className="w-full h-24 object-cover rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* AI Reasoning */}
              <div className="p-2.5 bg-slate-50 rounded-lg border-l-4 border-l-emerald-500 text-xs text-slate-600 leading-relaxed">
                {audit.ai_reasoning}
              </div>

              {/* Violations */}
              {audit.violations_json.length > 0 && (
                <div className="p-2.5 bg-red-50 rounded-lg text-xs text-red-700 space-y-1">
                  <span className="font-bold">Violations:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {audit.violations_json.map((v, idx) => (
                      <li key={idx}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
