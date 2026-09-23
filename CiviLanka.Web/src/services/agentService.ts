import axios from 'axios';

const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://localhost:8001';

export const agentClient = axios.create({
  baseURL: AGENT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000, // LangGraph agent can take 5-15s for full multi-step execution
});

export interface AgentHealth {
  status: string;
  service: string;
  gemini_api_key_configured: boolean;
  chat_model: string;
  embedding_model: string;
  retrieval_mode: string;
}

export interface MaterialItem {
  item_name: string;
  specification?: string;
  quantity: number;
  unit: string;
  unit_rate_lkr: number;
  total_cost_lkr: number;
  bsr_code?: string;
}

export interface LaborAndPlantItem {
  role_or_machine: string;
  days: number;
  daily_rate_lkr: number;
  total_cost_lkr: number;
}

export interface CostEstimateOutput {
  summary: string;
  infrastructure_category: string;
  severity: string;
  materials: MaterialItem[];
  labor_and_equipment: LaborAndPlantItem[];
  safety_and_preliminaries_lkr: number;
  contingency_percentage: number;
  contingency_cost_lkr: number;
  total_estimated_cost_lkr: number;
  estimated_duration_days: number;
  recommended_contractor_specialization: string;
  technical_notes: string;
  cited_sources: string[];
}

export interface EstimateRequest {
  hazard_type: string;
  severity: string;
  asset_name: string;
  asset_type: string;
  damage_description: string;
  location: string;
  thread_id?: string;
}

export interface EstimateResponse {
  thread_id: string;
  asset_name: string;
  hazard_type: string;
  severity: string;
  estimate: CostEstimateOutput | null;
  final_response: string;
  retries_count: number;
  retrieved_docs_preview: string;
}

export interface AskRequest {
  question: string;
  thread_id?: string;
}

export interface AskResponse {
  thread_id: string;
  question: string;
  answer: string;
}

export interface SearchHit {
  source: string;
  content: string;
}

export const agentService = {
  /**
   * Check if the CiviLanka.Agent service is running on port 8001
   */
  async checkHealth(): Promise<AgentHealth> {
    const res = await agentClient.get<AgentHealth>('/health');
    return res.data;
  },

  /**
   * Execute the full LangGraph Agentic RAG workflow to estimate repair costs
   */
  async estimateRepairCost(req: EstimateRequest): Promise<EstimateResponse> {
    const res = await agentClient.post<EstimateResponse>('/api/agent/estimate', req);
    return res.data;
  },

  /**
   * Ask the Sri Lanka civil engineering AI assistant a technical or procedural question
   */
  async askAssistant(question: string, threadId?: string): Promise<AskResponse> {
    const res = await agentClient.post<AskResponse>('/api/agent/ask', {
      question,
      thread_id: threadId,
    });
    return res.data;
  },

  /**
   * Perform direct hybrid search (BM25 + ChromaDB Vector + RRF) on Sri Lanka BSR rates
   */
  async searchKnowledgeBase(query: string, k = 4): Promise<SearchHit[]> {
    const res = await agentClient.get<SearchHit[]>('/api/agent/search', {
      params: { query, k },
    });
    return res.data;
  },

  /**
   * Trigger local document chunking & ChromaDB vector ingestion
   */
  async triggerIngest(): Promise<{ status: string; message: string; chunks_count: number }> {
    const res = await agentClient.post('/api/agent/ingest');
    return res.data;
  },
};

