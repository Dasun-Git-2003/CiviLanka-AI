import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Building2,
  Plus,
  Loader2,
  CheckCircle2,
  Pencil,
  Trash2,
  Calendar,
  Users,
  ShieldAlert,
  MapPin,
  Info,
} from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { contractorService } from '../services/contractorService';
import { CostEstimateEditorModal } from '../components/CostEstimateEditorModal';
import type { SaveWorkOrderEstimateDto, CostEstimatePreviewResponse } from '../types/workOrder';
import type { Contractor } from '../types/contractor';

export const CreateWorkOrder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [hazards, setHazards] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedHazardId, setSelectedHazardId] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [assignedCrew, setAssignedCrew] = useState('worker@civilanka.gov.lk');
  const [scheduledDate, setScheduledDate] = useState(
    new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  );
  const [recommendedCrewSize, setRecommendedCrewSize] = useState<number>(2);
  const [estimatedDurationHours, setEstimatedDurationHours] = useState<number>(4);
  const [estimatedCost, setEstimatedCost] = useState<number | ''>('');

  // AI Estimate Preview & Customization State
  const [estimating, setEstimating] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [customEstimate, setCustomEstimate] = useState<SaveWorkOrderEstimateDto | null>(null);
  const [previewEstimate, setPreviewEstimate] = useState<CostEstimatePreviewResponse | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hList, aList, cList] = await Promise.all([
          workOrderService.getHazards(),
          workOrderService.getAssets(),
          contractorService.getAll().catch(() => []),
        ]);
        setHazards(hList);
        setAssets(aList);
        setContractors(cList);

        const paramHazardId = searchParams.get('hazardId');
        if (paramHazardId) {
          const matched = hList.find((h: any) => h.id === paramHazardId);
          if (matched) {
            setSelectedHazardId(paramHazardId);
            setTitle(`Repair: ${matched.category} - ${matched.ticketNumber || 'Citizen Report'}`);
            setDescription(matched.description || '');
            setPriority(matched.priority || 'NORMAL');
            if (matched.priority === 'URGENT' || matched.priority === 'HIGH') {
              setRecommendedCrewSize(4);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching hazards/assets/contractors:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [searchParams]);

  // Autofill when a hazard is selected
  const handleHazardChange = (hazardId: string) => {
    setSelectedHazardId(hazardId);
    if (!hazardId) return;

    const hazard = hazards.find((h) => h.id === hazardId);
    if (hazard) {
      setTitle(`Repair: ${hazard.category} - ${hazard.ticketNumber || 'Citizen Report'}`);
      setDescription(hazard.description || '');
      setPriority(hazard.priority || 'NORMAL');
      if (hazard.priority === 'URGENT') {
        setRecommendedCrewSize(4);
        setEstimatedDurationHours(6);
      }
    }
  };

  const selectedHazard = hazards.find((h) => h.id === selectedHazardId);
  const selectedAsset = assets.find((a) => a.id === selectedAssetId);

  const handleEstimateAI = async () => {
    setEstimating(true);
    try {
      const preview = await workOrderService.previewEstimate({
        hazardId: selectedHazardId || undefined,
        assetId: selectedAssetId || undefined,
        category: selectedHazard?.category || 'Infrastructure Repair',
        description: description || title || 'Infrastructure maintenance and repair',
        priority,
      });
      setPreviewEstimate(preview);
      setShowEditorModal(true);
    } catch (err) {
      alert('AI estimation preview failed. Please check backend / Gemini configuration.');
      console.error(err);
    } finally {
      setEstimating(false);
    }
  };

  const handleSaveModalEstimate = (data: SaveWorkOrderEstimateDto) => {
    setCustomEstimate(data);
    setEstimatedCost(data.estimatedCost);
    if (data.recommendedCrewSize) setRecommendedCrewSize(data.recommendedCrewSize);
    if (data.estimatedDurationHours) setEstimatedDurationHours(data.estimatedDurationHours);
    setShowEditorModal(false);
  };

  const handleClearCustomEstimate = () => {
    setCustomEstimate(null);
    setPreviewEstimate(null);
    setEstimatedCost('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please provide a title and detailed scope description.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await workOrderService.create({
        hazardId: selectedHazardId || undefined,
        assetId: selectedAssetId || undefined,
        title,
        description,
        priority,
        assignedCrew: assignedCrew.trim() || undefined,
        scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
        estimatedCost: estimatedCost !== '' ? Number(estimatedCost) : undefined,
        materialCost: customEstimate?.materialCost,
        labourCost: customEstimate?.labourCost,
        equipmentCost: customEstimate?.equipmentCost,
        estimatedDurationHours: estimatedDurationHours || customEstimate?.estimatedDurationHours,
        recommendedCrewSize: recommendedCrewSize || customEstimate?.recommendedCrewSize,
        estimateReason: customEstimate?.reason,
        items: customEstimate?.items,
      });

      navigate(`/work-orders/${created.id}`);
    } catch (err) {
      alert('Failed to create work order.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const isDirectorApprovalRequired =
    (estimatedCost !== '' && Number(estimatedCost) > 100000) || priority === 'URGENT';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/work-orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Work Orders
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create Municipal Work Order</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Transform reported hazards or routine inspections into an authorized maintenance order.
            </p>
          </div>
          <span className="self-start sm:self-auto text-xs px-2.5 py-1 rounded-full bg-slate-100 font-bold text-slate-700">
            Official Municipal Work Order Form
          </span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span>Loading municipal hazards, infrastructure registry &amp; contractors...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          {/* ─── SECTION 1: ORIGINATING LINKAGES ─── */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <span>Originating Source &amp; Asset Associations</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Citizen Hazard Linkage */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Originating Citizen Hazard
                </label>
                <select
                  value={selectedHazardId}
                  onChange={(e) => handleHazardChange(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Standalone / Proactive Maintenance (No Citizen Report)</option>
                  {hazards.map((h) => (
                    <option key={h.id} value={h.id}>
                      [{h.ticketNumber || 'TICKET'}] {h.category} - {h.address || h.description?.slice(0, 35)}
                    </option>
                  ))}
                </select>

                {/* Selected Hazard Summary Card */}
                {selectedHazard && (
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-amber-900">
                      <span>[{selectedHazard.ticketNumber}] {selectedHazard.category}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-200/80 text-amber-800">
                        {selectedHazard.priority || 'NORMAL'}
                      </span>
                    </div>
                    {selectedHazard.address && (
                      <div className="text-[11px] text-amber-700 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-amber-600 flex-shrink-0" />
                        <span className="truncate">{selectedHazard.address}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Infrastructure Asset Linkage */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  Target Infrastructure Asset
                </label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">Select Asset (Optional)...</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.id}] {a.name} ({a.type} - {a.location})
                    </option>
                  ))}
                </select>

                {/* Selected Asset Summary Card */}
                {selectedAsset && (
                  <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-blue-900">
                      <span>[{selectedAsset.id}] {selectedAsset.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-blue-200/80 text-blue-800">
                        Condition: {selectedAsset.latestCondition || 'Good'}
                      </span>
                    </div>
                    <div className="text-[11px] text-blue-700 truncate">
                      {selectedAsset.type} Asset • {selectedAsset.location}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── SECTION 2: WORK ORDER SPECIFICATIONS ─── */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <span>Work Order Specifications</span>
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Order Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Structural repair of damaged culvert on Galle Road"
                className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none font-semibold text-slate-900"
              />
            </div>

            {/* Scope / Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Detailed Scope of Work &amp; Execution Instructions <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify excavation requirements, technical remediation method, concrete grades, and citizen safety isolation..."
                className="w-full text-xs border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none text-slate-800"
              />
            </div>

            {/* Priority Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Repair Priority Level
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'LOW', label: 'LOW Priority', color: 'border-slate-300 hover:bg-slate-50' },
                  { id: 'NORMAL', label: 'NORMAL Priority', color: 'border-blue-300 hover:bg-blue-50 text-blue-700' },
                  { id: 'HIGH', label: 'HIGH Priority', color: 'border-amber-300 hover:bg-amber-50 text-amber-700' },
                  { id: 'URGENT', label: 'URGENT (Immediate)', color: 'border-rose-400 hover:bg-rose-50 text-rose-700' },
                ].map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPriority(p.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      priority === p.id
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                        : p.color
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ─── SECTION 3: SCHEDULING & CREW / CONTRACTOR DISPATCH ─── */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center">
                3
              </span>
              <span>Crew Allocation &amp; Schedule</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Assigned Crew or Contractor */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Assigned Crew or Contractor
                </label>
                <select
                  value={assignedCrew}
                  onChange={(e) => setAssignedCrew(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                >
                  <optgroup label="Municipal Field Technicians">
                    <option value="worker@civilanka.gov.lk">Default Field Worker (worker@civilanka.gov.lk)</option>
                    <option value="supervisor@civilanka.gov.lk">Field Maintenance Supervisor</option>
                    <option value="Colombo Central Rapid Response Crew">Colombo Central Rapid Response Crew</option>
                    <option value="North District Road Maintenance Team">North District Road Maintenance Team</option>
                    <option value="South Drainage & Civil Works Crew">South Drainage &amp; Civil Works Crew</option>
                  </optgroup>
                  {contractors.length > 0 && (
                    <optgroup label="Registered Municipal Contractors">
                      {contractors.map((c) => (
                        <option key={c.id} value={`${c.name} (${c.email || c.phone})`}>
                          {c.name} — {c.specialization} ({c.isAvailable ? 'Available' : 'Busy'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Scheduled Execution Date */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Scheduled Execution Date
                </label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Crew Size & Duration */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Crew Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={recommendedCrewSize}
                    onChange={(e) => setRecommendedCrewSize(parseInt(e.target.value) || 1)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={estimatedDurationHours}
                    onChange={(e) => setEstimatedDurationHours(parseFloat(e.target.value) || 1)}
                    className="w-full text-xs border border-slate-200 rounded-xl p-2.5 text-center font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── SECTION 4: BUDGET & AI ESTIMATOR ─── */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center">
                  4
                </span>
                <span>Financial Budget &amp; Materials Estimation</span>
              </h2>

              <button
                type="button"
                onClick={handleEstimateAI}
                disabled={estimating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 text-indigo-800 border border-indigo-200 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50 self-start sm:self-auto"
              >
                <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${estimating ? 'animate-spin' : ''}`} />
                <span>{estimating ? 'Analyzing with AI...' : 'Estimate & Customize with AI'}</span>
              </button>
            </div>

            {/* Cost Input & Preset Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimated Work Order Budget (LKR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={estimatedCost}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : '';
                      setEstimatedCost(val);
                      if (customEstimate) {
                        setCustomEstimate({ ...customEstimate, estimatedCost: Number(val) || 0 });
                      }
                    }}
                    placeholder="e.g. 50000 or click AI Estimate"
                    className="w-full pl-10 pr-3 py-2.5 text-xs font-mono font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-slate-400">Quick Municipal Budget Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[25000, 50000, 75000, 100000, 150000].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setEstimatedCost(amt)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-mono font-semibold text-slate-600 transition-colors"
                    >
                      Rs. {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom Estimate Breakdown Card */}
            {customEstimate && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-2xs mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-emerald-950 flex flex-wrap items-center gap-2">
                      <span>Custom AI Estimate Configured:</span>
                      <span className="font-mono text-emerald-800 font-black text-sm">
                        Rs. {Number(customEstimate.estimatedCost).toLocaleString('en-LK')}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        {customEstimate.items.length} materials &amp; items
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      Materials: <strong>Rs. {Number(customEstimate.materialCost || 0).toLocaleString()}</strong> •
                      Labour: <strong>Rs. {Number(customEstimate.labourCost || 0).toLocaleString()}</strong> •
                      Equipment: <strong>Rs. {Number(customEstimate.equipmentCost || 0).toLocaleString()}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setShowEditorModal(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-900 font-semibold text-xs hover:bg-emerald-100/50 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Breakdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCustomEstimate}
                    className="p-1.5 text-emerald-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Clear customized estimate"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Dynamic Director Approval Warning / Info */}
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                isDirectorApprovalRequired
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              {isDirectorApprovalRequired ? (
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                {isDirectorApprovalRequired ? (
                  <>
                    <strong className="font-bold text-amber-950">Director Approval Mandatory:</strong> This work order
                    exceeds the <strong>Rs. 100,000 threshold</strong> or is marked URGENT. Upon creation, it will be placed in
                    the <strong>Director Approval Queue</strong> before field dispatch.
                  </>
                ) : (
                  <>
                    <strong className="font-bold text-slate-800">Standard Supervisory Flow:</strong> Orders under Rs. 100,000
                    can be assigned and dispatched by Field Maintenance Supervisors.
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              to="/work-orders"
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-md hover:shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {submitting
                ? 'Creating Work Order...'
                : customEstimate
                ? 'Create Order with Custom Estimate'
                : 'Create Work Order'}
            </button>
          </div>
        </form>
      )}

      {/* AI Cost & Materials Estimation Review & Editor Modal */}
      {showEditorModal && (
        <CostEstimateEditorModal
          isOpen={showEditorModal}
          onClose={() => setShowEditorModal(false)}
          initialEstimate={customEstimate || previewEstimate}
          initialItems={customEstimate ? customEstimate.items : previewEstimate?.items}
          onSave={handleSaveModalEstimate}
          onRegenerateAI={handleEstimateAI}
          title="AI Cost Estimator & Material Requisition"
          subtitle="Review estimated materials, labor hours, and machinery rates. Customize items before saving."
        />
      )}
    </div>
  );
};
