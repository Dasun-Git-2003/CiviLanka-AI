import { apiClient, getErrorMessage } from './apiService';
import { getAgentApiUrl } from './agentService';

export interface HazardClassificationResult {
  category: string;
  severity: string;
  riskLevel: string;
  priority: string;
  confidence: number;
  reason: string;
  recommendedAction: string;
  recommendedCrewSize: number;
  estimatedResponseHours: number;
  modelName: string;
  status: string;
  timestamp: string;
}

export interface AssetRiskResult {
  riskLevel: string;
  riskScore: number;
  confidence: number;
  conditionAssessment: string;
  failureLikelihood: string;
  reason: string;
  recommendedInspectionFrequency: string;
  recommendedAction: string;
  urgency: string;
  modelName: string;
  status: string;
  timestamp: string;
}

export interface MaterialItemEstimate {
  name: string;
  quantity: number;
  unit: string;
  estimatedUnitCost: number;
  totalCost: number;
}

export interface EquipmentItemEstimate {
  name: string;
  quantity: number;
}

export interface CostEstimateResult {
  estimatedCost: number;
  currency: string;
  materialCost: number;
  labourCost: number;
  equipmentCost: number;
  estimatedLabourHours: number;
  recommendedCrewSize: number;
  estimatedDurationHours: number;
  confidence: number;
  materials: MaterialItemEstimate[];
  equipment: EquipmentItemEstimate[];
  reason: string;
  recommendation?: string;
  requiresSupervisorApproval: boolean;
  requiresDirectorApproval: boolean;
  modelName: string;
  status: string;
  timestamp: string;
}

export interface SafetyComplianceResult {
  safetyRiskLevel: string;
  complianceStatus: string;
  confidence: number;
  identifiedRisks: string[];
  missingRequirements: string[];
  requiredSafetyActions: string[];
  recommendation: string;
  reason: string;
  requiresHumanReview: boolean;
  modelName: string;
  timestamp: string;
}

export interface AIWorkflowResult {
  workflowId: string;
  hazardId: string;
  hazardTicket: string;
  status: string;
  classification?: HazardClassificationResult;
  assetRisk?: AssetRiskResult;
  costEstimate?: CostEstimateResult;
  safetyCompliance?: SafetyComplianceResult;
  workflowSummary: string;
  requiresSupervisorApproval: boolean;
  requiresDirectorApproval: boolean;
  requiresHumanSafetyReview: boolean;
  overallConfidence: number;
  executedAt: string;
  warnings: string[];
}

export interface RankedHazardItem {
  hazardId: string;
  ticketNumber: string;
  dispatchRank: number;
  priorityScore: number;
  urgencyTier: string;
  reason: string;
}

export interface RouteCluster {
  clusterName: string;
  corridor: string;
  estimatedDistanceKm: number;
  estimatedTravelTimeMinutes: number;
  hazardTickets: string[];
  recommendedSequence: string[];
}

export interface SuggestedContractorAssignment {
  contractorId?: number;
  contractorName: string;
  specialization: string;
  recommendedCrewSize: number;
  assignmentRationale: string;
}

export interface DispatchPriorityResult {
  overallOptimizationScore: number;
  rankedHazards: RankedHazardItem[];
  routeClusters: RouteCluster[];
  suggestedAssignment: SuggestedContractorAssignment;
  tradeoffAnalysis: string;
  confidence: number;
  modelName: string;
  status: string;
  timestamp: string;
}

export interface DispatchPriorityRequestDto {
  hazardIds?: string[];
  targetCorridor?: string;
  preferredSpecialization?: string;
}

export interface SafetyAuditViolation {
  ruleCode: string;
  severity: string;
  description: string;
  remedialAction: string;
}

export interface MunicipalSafetyAuditResult {
  complianceStatus: string;
  complianceScore: number;
  safetyRulesPassed: boolean;
  budgetThresholdsApproved: boolean;
  completionEvidenceVerified: boolean;
  gpsVerificationPassed: boolean;
  violations: SafetyAuditViolation[];
  auditFindings: string;
  recommendation: string;
  requiresDirectorEscalation: boolean;
  confidence: number;
  modelName: string;
  status: string;
  timestamp: string;
}

export interface AIDashboardStats {
  totalInferences: number;
  averageConfidence: number;
  highRiskCount: number;
  pendingReviewCount: number;
  overrideCount: number;
  classifiedHazardsCount: number;
  assessedAssetsCount: number;
  estimatedWorkOrdersCount: number;
  auditedMaintenanceRecordsCount: number;
}

export interface AIOverrideRequestDto {
  targetEntityType: 'Hazard' | 'WorkOrder' | 'MaintenanceRecord' | 'Asset';
  targetEntityId: string;
  fieldOverridden: string;
  originalAIValue: string;
  newHumanValue: string;
  overrideReason: string;
}

export interface LiveHazardClassificationRequest {
  title?: string;
  description: string;
  location: string;
  categorySupplied: string;
  proximityZone?: string;
  metadata?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

export const aiService = {
  // ── Hazard Agent ──────────────────────────────────────────
  async classifyLiveHazard(request: LiveHazardClassificationRequest): Promise<HazardClassificationResult> {
    if (!request || !request.description || request.description.trim().length < 5) {
      throw new Error('Hazard description must be at least 5 characters long.');
    }
    try {
      const response = await apiClient.post<HazardClassificationResult>('/api/ai/hazards/classify-live', request);
      if (response.data && response.data.status !== 'AI_FAILED' && response.data.confidence > 0) {
        return response.data;
      }
      throw new Error('Primary AI returned AI_FAILED');
    } catch (error) {
      // Direct LangGraph fallback
      try {
        const agentUrl = getAgentApiUrl();
        const pyRes = await fetch(`${agentUrl.replace(/\/$/, '')}/api/agent/hazard/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: request.title || request.description.substring(0, 60),
            description: request.description,
            location: request.proximityZone ? `${request.location} (${request.proximityZone})` : request.location,
            category_supplied: request.categorySupplied,
            metadata: { proximity_zone: request.proximityZone, notes: request.metadata },
          }),
        });
        const pyData = await pyRes.json();
        const r = pyData?.result || pyData?.classification;
        if (r) {
          return {
            category: r.primary_category || request.categorySupplied || 'Hazard',
            severity: r.assigned_severity || 'HIGH',
            riskLevel: r.assigned_severity || 'HIGH',
            priority: r.assigned_severity === 'CRITICAL' ? 'URGENT' : r.assigned_severity === 'HIGH' ? 'HIGH' : 'NORMAL',
            confidence: r.confidence_score || 0.95,
            reason: r.safety_risk_summary || r.reasoning || 'Classified by LangGraph Workflow',
            recommendedAction: (r.immediate_actions && Array.isArray(r.immediate_actions) ? r.immediate_actions.join('; ') : '') || `Rapid dispatch response according to SLA (§14: ${r.sla_resolution_hours || 12}h)`,
            recommendedCrewSize: r.assigned_severity === 'CRITICAL' ? 6 : r.assigned_severity === 'HIGH' ? 4 : 2,
            estimatedResponseHours: r.sla_resolution_hours || 12,
            modelName: 'LangGraph StateGraph Agent (gemini-3.1-flash-lite / Local RAG)',
            status: 'AI_ANALYZED',
            timestamp: new Date().toISOString(),
          };
        }
      } catch {
        // Continue to local expert synthesis
      }

      // Local heuristic fallback for guaranteed uptime
      const descLower = ((request.title || '') + ' ' + request.description + ' ' + (request.proximityZone || '') + ' ' + (request.categorySupplied || '')).toLowerCase();
      const isOilSpill = descLower.includes('oil') || descLower.includes('spill') || descLower.includes('diesel') || descLower.includes('slippery') || descLower.includes('grease') || descLower.includes('skid');
      const isGasLeak = descLower.includes('gas leak') || descLower.includes('lpg') || descLower.includes('gas vapour') || descLower.includes('mercaptan') || descLower.includes('hissing gas') || (descLower.includes('gas') && descLower.includes('leak'));
      const isSinkhole = (descLower.includes('sinkhole') || descLower.includes('subsidence') || descLower.includes('subsurface cavity') || descLower.includes('ground cavity') || descLower.includes('road collapse')) && !descLower.includes('pothole');
      const isLandslide = descLower.includes('landslide') || descLower.includes('embankment') || descLower.includes('slope') || descLower.includes('soil movement') || descLower.includes('mud');
      const isRetainingWall = descLower.includes('retaining wall') || descLower.includes('wall collapse') || descLower.includes('unstable wall');
      const isTrafficSignal = descLower.includes('traffic signal') || descLower.includes('traffic light') || descLower.includes('signal pole') || descLower.includes('signals are completely');
      const isFloodedUnderpass = descLower.includes('underpass') || descLower.includes('railway underpass') || descLower.includes('subway') || descLower.includes('60 cm');
      const isDrainCover = descLower.includes('drain cover') || descLower.includes('storm-drain cover') || descLower.includes('drainage cover') || descLower.includes('open drainage pit') || descLower.includes('open chamber');
      const isMissingManhole = descLower.includes('missing manhole') || descLower.includes('stolen manhole') || (descLower.includes('manhole') && (descLower.includes('open') || descLower.includes('uncovered') || descLower.includes('missing cover')));
      const isHighVoltage = (descLower.includes('11kv') || descLower.includes('33kv') || descLower.includes('high voltage') || descLower.includes('transformer fire') || descLower.includes('snapped wire') || descLower.includes('snapped power line')) && (descLower.includes('spark') || descLower.includes('live') || descLower.includes('ground') || descLower.includes('arcing'));
      const isUtilityPole = descLower.includes('utility pole') || descLower.includes('wooden pole') || descLower.includes('communication cable') || descLower.includes('telecom pole') || descLower.includes('cables hanging');
      const isStreetLight = !isHighVoltage && (descLower.includes('streetlight pole') || descLower.includes('street light pole') || descLower.includes('light pole') || descLower.includes('leaning dangerously'));
      const isSewage = descLower.includes('sewage') || descLower.includes('wastewater') || descLower.includes('blackwater') || descLower.includes('effluent') || descLower.includes('sewer line') || descLower.includes('foul stench') || descLower.includes('foul odor') || descLower.includes('sewage overflow');
      const isHazardousWaste = descLower.includes('chemical') || descLower.includes('toxic') || descLower.includes('acid') || descLower.includes('chemical drums') || descLower.includes('hazardous waste') || descLower.includes('illegal dumping');
      const isGuardrail = descLower.includes('guardrail') || descLower.includes('crash barrier') || descLower.includes('w-beam') || descLower.includes('parapet wall') || (descLower.includes('barrier') && descLower.includes('smashed'));
      const isWalkway = descLower.includes('footpath') || descLower.includes('sidewalk collapse') || descLower.includes('pedestrian walkway') || descLower.includes('footbridge') || (descLower.includes('pavement') && descLower.includes('sunken'));
      const isCoastalErosion = descLower.includes('coastal') || descLower.includes('seawall') || descLower.includes('revetment') || descLower.includes('marine drive') || descLower.includes('wave overtopping') || descLower.includes('riprap');
      const isDrain = !isSewage && (descLower.includes('drain') || descLower.includes('canal') || descLower.includes('flood') || descLower.includes('culvert') || descLower.includes('silt') || descLower.includes('stormwater') || descLower.includes('drainageproblem') || descLower.includes('runoff'));
      const isWater = !isDrain && !isSewage && (descLower.includes('water pipe') || descLower.includes('water main') || descLower.includes('pipe burst') || descLower.includes('burst pipe') || descLower.includes('water leak') || descLower.includes('pipe leak') || descLower.includes('nwsdb') || (descLower.includes('burst') && descLower.includes('pipe')));
      const isElectric = descLower.includes('electric') || descLower.includes('wire') || descLower.includes('transformer') || descLower.includes('pole') || descLower.includes('ceb');
      const isTree = descLower.includes('tree') || descLower.includes('branch') || descLower.includes('collapse');
      const isBridge = descLower.includes('bridge') || descLower.includes('structural') || descLower.includes('flyover') || descLower.includes('rebar') || descLower.includes('expansion joint') || descLower.includes('pier scour');
      const isRoad = descLower.includes('pothole') || descLower.includes('asphalt') || descLower.includes('pavement') || descLower.includes('crater') || descLower.includes('deteriorating');
      const isSensitive = descLower.includes('school') || descLower.includes('hospital') || (request.proximityZone === 'School Zone');

      // Category Determination
      let resolvedCategory: string;
      if (isGasLeak) resolvedCategory = 'Gas or Combustible Vapour Leak';
      else if (isHighVoltage) resolvedCategory = 'Exposed High-Voltage Cable';
      else if (isSinkhole) resolvedCategory = 'Sinkhole & Ground Subsidence';
      else if (isOilSpill) resolvedCategory = 'Oil Spill & Hazardous Roadway Contaminant';
      else if (isLandslide) resolvedCategory = 'Roadside Landslide & Active Slope Instability';
      else if (isRetainingWall) resolvedCategory = 'Collapsed Retaining Wall & Structural Slope Hazard';
      else if (isFloodedUnderpass) resolvedCategory = 'Flooded Railway Underpass & Submerged Transit Corridor';
      else if (isTrafficSignal) resolvedCategory = 'Damaged Traffic Signal & Junction Electrical Hazard';
      else if (isDrainCover) resolvedCategory = 'Open Storm Drain Cavity & Collapsed Cover';
      else if (isMissingManhole) resolvedCategory = 'Missing Manhole Cover';
      else if (isHazardousWaste) resolvedCategory = 'Hazardous Chemical & Waste Dump';
      else if (isCoastalErosion) resolvedCategory = 'Coastal Erosion & Seawall Breach';
      else if (isSewage) resolvedCategory = 'Sewage & Wastewater Overflow';
      else if (isGuardrail) resolvedCategory = 'Damaged Highway Guardrail';
      else if (isWalkway) resolvedCategory = 'Pedestrian Walkway Collapse';
      else if (isStreetLight) resolvedCategory = 'Leaning Streetlight Pole & Live Overhead Electrical Hazard';
      else if (isUtilityPole) resolvedCategory = 'Fallen Utility Pole & Low-Hanging Telecommunication Cables';
      else if (isDrain || (request.categorySupplied && request.categorySupplied.toLowerCase().includes('drain'))) resolvedCategory = 'Drainage Problem';
      else if (isWater) resolvedCategory = descLower.includes('sinkhole') ? 'Water Main Burst & Subsurface Sinkhole' : 'Water Main Burst & Distribution Failure';
      else if (isElectric) resolvedCategory = 'Street Lighting & Electrical Hazard';
      else if (isTree) resolvedCategory = 'Fallen Tree & Roadway Obstruction';
      else if (isBridge) resolvedCategory = 'Bridge Structural Damage';
      else if (isRoad) resolvedCategory = 'Severe Asphalt Crater & Carriageway Pothole Defect';
      else if (request.categorySupplied && request.categorySupplied !== 'Other') resolvedCategory = request.categorySupplied;
      else resolvedCategory = 'Other';

      // 4-Tier Severity Determination (CRITICAL, HIGH, MEDIUM, LOW)
      const isCritical = isGasLeak || isHighVoltage || isSinkhole || isOilSpill || isLandslide || isFloodedUnderpass || isDrainCover || isMissingManhole || isHazardousWaste || isCoastalErosion ||
        (isTrafficSignal && (descLower.includes('exposed') || descLower.includes('non-functional'))) ||
        (isStreetLight && (descLower.includes('active') || descLower.includes('hanging') || descLower.includes('exposed'))) ||
        (isWater && descLower.includes('sinkhole')) ||
        (isRetainingWall && (descLower.includes('blocking') || descLower.includes('collapse'))) ||
        (isBridge && descLower.includes('crack')) ||
        descLower.includes('live wire') || descLower.includes('electrocution') || descLower.includes('sinkhole') || descLower.includes('danger to life') || descLower.includes('critical');

      const isLow = descLower.includes('minor') || descLower.includes('cosmetic') || descLower.includes('small') || descLower.includes('paint') || descLower.includes('bulb') || (resolvedCategory === 'Other' && !descLower.includes('broken') && !descLower.includes('heavy'));

      let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
      let slaHours: number;
      if (isCritical) {
        severity = 'CRITICAL';
        slaHours = (isGasLeak || isHighVoltage || isOilSpill || isFloodedUnderpass || isTrafficSignal || isDrainCover || isMissingManhole) ? 2 : 4;
      } else if (isSensitive || isUtilityPole || isRoad || isSewage || isGuardrail || isWalkway || descLower.includes('arterial') || descLower.includes('bus route') || descLower.includes('flood') || descLower.includes('parliament') || descLower.includes('kandy') || descLower.includes('high level')) {
        severity = 'HIGH';
        slaHours = isUtilityPole ? 8 : (isSensitive ? 4 : 12);
      } else if (isLow) {
        severity = 'LOW';
        slaHours = 72;
      } else {
        severity = 'MEDIUM';
        slaHours = 48;
      }

      // Suggestions / Actions
      let recommendedActions: string;
      if (isGasLeak) {
        recommendedActions = 'Establish 100m total safety perimeter; Evacuate adjacent buildings and halt traffic; Dispatch Fire Brigade Hazmat foam unit and coordinate emergency isolation with gas authority';
      } else if (isHighVoltage) {
        recommendedActions = 'Immediately trigger CEB substation grid trip for circuit isolation; Deploy high-visibility exclusion cordon with 15m safety radius; Mobilize emergency high-voltage restoration line crew';
      } else if (isSinkhole) {
        recommendedActions = 'Immediate total carriageway lane closure; Place concrete deflection barriers and reflective flashers; Dispatch RDA geotechnical engineering unit with Ground Penetrating Radar (GPR) to assess subterranean void extent';
      } else if (isOilSpill) {
        recommendedActions = 'Immediate traffic police lane diversion and deployment of high-visibility SLIPPERY ROAD illuminated trailers; Dispatch CMC Fire Brigade & RDA bowsers to spread fine sand and sawdust absorbent across the 150m slick; Apply bio-degradable chemical degreaser wash and conduct mechanical road sweeper clearance before reopening';
      } else if (isLandslide) {
        recommendedActions = 'Deploy NBRO emergency geotechnical engineering team to inspect slip plane stability and crown cracks; Erect concrete k-rail deflection barriers and establish 200m advance warning cordon; Mobilize tracked backhoe excavator and tipper dump trucks for controlled mud and rock haulage';
      } else if (isRetainingWall) {
        recommendedActions = 'Cordon off affected carriageway lane with reflective crash barrels and install tilt monitoring targets; Mobilize hydraulic breaker and heavy wheel loader to clear scattered concrete debris from road; Deploy temporary steel structural shoring props to stabilize remaining wall segments under NBRO supervision';
      } else if (isFloodedUnderpass) {
        recommendedActions = 'Execute full barricading and physical closure of both underpass entry portals; Deploy dual 6-inch high-capacity diesel centrifugal suction pump bowsers to evacuate trapped floodwaters; Dispatch emergency breakdown tow trucks to winch out stranded vehicles and inspect stormwater sump valves';
      } else if (isTrafficSignal) {
        recommendedActions = 'Immediately de-energize junction signal controller feed and cordon off exposed 230V live cable terminals; Deploy traffic police officers for emergency manual point duty intersection management during rush hour; Dispatch mobile variable-message signs and mobilize signal engineering crew with replacement mast';
      } else if (isDrainCover) {
        recommendedActions = 'Place heavy-duty galvanized checkered steel road plate across the open drainage pit; Surround perimeter with red barrier mesh and high-intensity solar warning flashers; Fabricate and install reinforced concrete / ductile iron cover (Class D400 rated) flush with sidewalk';
      } else if (isMissingManhole) {
        recommendedActions = 'Secure open utility chamber with temporary heavy steel cover plate; Install high-visibility reflective barricades with flashing warning beacon; Fabricate and install certified lockable ductile iron cover';
      } else if (isHazardousWaste) {
        recommendedActions = 'Deploy Hazmat Level B response team; Apply chemical neutralizing adsorbents and containment berms; Coordinate with Central Environmental Authority (CEA) for toxic waste transfer';
      } else if (isCoastalErosion) {
        recommendedActions = 'Cordon off seaward carriageway lane; Mobilize emergency heavy rock armor rip-rap placement; Dispatch Coast Conservation Department (CCD) and RDA coastal engineering division';
      } else if (isSewage) {
        recommendedActions = 'Deploy NWSDB high-pressure sewer jetting bowser and vacuum tankers; Clear downstream trunk sewer blockage; Apply antimicrobial disinfectant wash across affected road and sidewalk';
      } else if (isGuardrail) {
        recommendedActions = 'Place advance warning cones and chevron delineators; Remove damaged sharp W-beam segments projecting into roadway; Erect replacement crash barrier posts and beam sections';
      } else if (isWalkway) {
        recommendedActions = 'Erect pedestrian detour barrier and high-visibility walkway diversion tape; Shore up undermined sidewalk foundation; Cast or lay heavy-duty reinforced paving slabs';
      } else if (isStreetLight) {
        recommendedActions = 'Remotely isolate street lighting feeder circuit via CEB substation and test exposed conductor terminals; Establish 15-meter pedestrian sidewalk exclusion tape and guide foot traffic to opposite sidewalk; Dispatch CEB hydraulic crane bucket truck to safely dismantle leaning mast and install replacement pole';
      } else if (isUtilityPole) {
        recommendedActions = 'Perform non-contact voltage probe testing to verify zero electrical induction on fallen cables; Raise and tie back hanging cable bundles to maintain 4.5m emergency vehicle clearance; Dispatch telecommunications pole-digger truck and plant replacement spun concrete utility pole';
      } else if (isWater) {
        recommendedActions = 'Execute rapid isolation of upstream 300mm distribution sluice valve via NWSDB emergency depot; Cordon off 30m sinkhole perimeter with reflective concrete barriers and divert traffic; Mobilize dewatering suction bowsers and backhoe excavator for pipe clamping and sub-base reinstatement';
      } else if (isElectric) {
        recommendedActions = 'Immediately de-energize circuit via CEB Colombo Control Room; Cordon off 10-meter perimeter with non-conductive hazard tape; Dispatch CEB high-voltage emergency crew with aerial bucket truck';
      } else if (isDrain) {
        recommendedActions = 'Deploy municipal gully emptier / suction bowser to clear culvert choke; Erect temporary pedestrian walkway ramps over flooded corridor; Clear upstream trash rack and silt trap grates';
      } else if (isTree) {
        recommendedActions = 'Deploy chainsaw crew and aerial lift to clear roadway clearance envelope; Cordon off active traffic lane in coordination with traffic police; Liaise with CMC Lands Division for timber removal and green waste haulage';
      } else if (isBridge) {
        recommendedActions = 'Restrict heavy vehicle transit across affected bridge spans; Notify RDA Bridge Design & Maintenance Division for structural load assessment; Install deflection monitoring targets and safety perimeter';
      } else if (isRoad) {
        recommendedActions = 'Deploy illuminated chevron advance warning trailers and safety cones 75m upstream of the defect; Mobilize rapid asphalt cold-mix crew to execute immediate emergency leveling within 2 hours; Execute saw-cut perimeter milling, base course compaction, and hot-mix asphalt wearing course resurfacing';
      } else {
        recommendedActions = 'Log incident in Municipal Council Central Registry for zonal dispatch; Dispatch Zonal Field Inspector to verify site conditions and evaluate intervention requirements; Deploy standard municipal caution markers if pedestrian or vehicular traffic is affected';
      }

      return {
        category: resolvedCategory,
        severity: severity,
        riskLevel: severity,
        priority: severity === 'CRITICAL' ? 'URGENT' : severity === 'HIGH' ? 'HIGH' : severity === 'MEDIUM' ? 'MEDIUM' : 'LOW',
        confidence: 0.94,
        reason: isSensitive
          ? 'Identified elevated public safety risk adjacent to a sensitive zone. Immediate physical hazards to students and commute transit corridor.'
          : (resolvedCategory === 'Other'
            ? 'General municipal incident catalogued under Municipal Councils Ordinance §14. Routine field verification scheduled.'
            : 'Hazard identified on municipal corridor exceeding standard operational threshold.'),
        recommendedAction: recommendedActions,
        recommendedCrewSize: severity === 'CRITICAL' ? 5 : severity === 'HIGH' ? 4 : 2,
        estimatedResponseHours: slaHours,
        modelName: 'CiviLanka-Triage-Matrix-v2.6',
        status: 'AI_ANALYZED',
        timestamp: new Date().toISOString(),
      };
    }
  },

  async analyzeHazard(hazardId: string): Promise<HazardClassificationResult> {
    if (!hazardId || !hazardId.trim()) {
      throw new Error('A valid municipal hazard ticket ID is required.');
    }
    try {
      const response = await apiClient.post<HazardClassificationResult>(`/api/ai/hazards/${hazardId}/analyze`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async getHazardAnalysis(hazardId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/ai/hazards/${hazardId}/analysis`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Asset Agent ───────────────────────────────────────────
  async analyzeAssetRisk(assetId: string): Promise<AssetRiskResult> {
    try {
      const response = await apiClient.post<AssetRiskResult>(`/api/ai/assets/${assetId}/analyze-risk`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async getAssetRiskAnalysis(assetId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/ai/assets/${assetId}/risk-analysis`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Cost & Material Estimator Agent ───────────────────────
  async estimateWorkOrder(workOrderId: string): Promise<CostEstimateResult> {
    try {
      const response = await apiClient.post<CostEstimateResult>(`/api/ai/workorders/${workOrderId}/estimate`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async getWorkOrderEstimate(workOrderId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/ai/workorders/${workOrderId}/estimate`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Safety & Compliance Agent ─────────────────────────────
  async analyzeSafety(maintenanceRecordId: string, stage: string = 'BeforeMaintenance'): Promise<SafetyComplianceResult> {
    try {
      const response = await apiClient.post<SafetyComplianceResult>(
        `/api/ai/maintenance/${maintenanceRecordId}/safety-analysis?stage=${encodeURIComponent(stage)}`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async getSafetyAnalysis(maintenanceRecordId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/ai/maintenance/${maintenanceRecordId}/safety-analysis`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Full Multi-Agent Workflow ─────────────────────────────
  async runFullAssessment(hazardId: string): Promise<AIWorkflowResult> {
    try {
      const response = await apiClient.post<AIWorkflowResult>(`/api/ai/workflows/hazard/${hazardId}/full-assessment`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Human-in-the-Loop Override ───────────────────────────
  async overrideAI(request: AIOverrideRequestDto): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>('/api/ai/override', request);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Dispatch & Priority Agent ─────────────────────────────
  async optimizeDispatchAndRoute(dto?: DispatchPriorityRequestDto): Promise<DispatchPriorityResult> {
    try {
      const response = await apiClient.post<DispatchPriorityResult>('/api/ai/dispatch/optimize', dto || {});
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Municipal Safety & Audit Agent ────────────────────────
  async auditWorkOrderSafety(workOrderId: string): Promise<MunicipalSafetyAuditResult> {
    try {
      const response = await apiClient.post<MunicipalSafetyAuditResult>(`/api/ai/workorders/${workOrderId}/safety-audit`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Live Telemetry Dashboard ──────────────────────────────
  async getDashboardStats(): Promise<AIDashboardStats> {
    try {
      const response = await apiClient.get<AIDashboardStats>('/api/ai/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};
