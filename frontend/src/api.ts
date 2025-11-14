import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CaseData {
  caseType: string;
  jurisdiction: string;
  sideASummary: string;
  sideAEvidence: string[];
  sideBSummary: string;
  sideBEvidence: string[];
  sideADocs?: File[];
  sideBDocs?: File[];
}

export interface Judgment {
  verdict: string;
  reasoning: string;
  legalBasis: string[];
  confidence: number;
  cached?: boolean;
}

export interface ArgumentResponse {
  response: string;
  strengthens?: 'Side A' | 'Side B' | 'Neither';
  weakens?: 'Side A' | 'Side B' | 'Neither';
  uncertaintyRemains?: string;
  reconsidered: boolean;
  updatedReasoning?: string;
  provisionalNote?: string;
  confidence: number;
  remainingArguments: number;
}

export interface ArgumentRecord {
  id: string;
  side: 'A' | 'B';
  argument: string;
  response: string;
  strengthens?: 'Side A' | 'Side B' | 'Neither';
  weakens?: 'Side A' | 'Side B' | 'Neither';
  uncertaintyRemains?: string;
  provisionalNote?: string;
  reconsidered: boolean;
  sequenceNumber: number;
}

/**
 * Create a new case
 */
export async function createCase(data: CaseData): Promise<{ caseId: string }> {
  const formData = new FormData();
  
  formData.append('caseType', data.caseType);
  formData.append('jurisdiction', data.jurisdiction);
  formData.append('sideASummary', data.sideASummary);
  formData.append('sideBSummary', data.sideBSummary);
  formData.append('sideAEvidence', JSON.stringify(data.sideAEvidence));
  formData.append('sideBEvidence', JSON.stringify(data.sideBEvidence));
  
  // Append documents
  if (data.sideADocs) {
    data.sideADocs.forEach((file) => {
      formData.append('sideADocs', file);
    });
  }
  
  if (data.sideBDocs) {
    data.sideBDocs.forEach((file) => {
      formData.append('sideBDocs', file);
    });
  }
  
  const response = await api.post('/cases', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
}

/**
 * Generate judgment for a case
 */
export async function generateJudgment(caseId: string): Promise<Judgment> {
  const response = await api.post(`/cases/${caseId}/judgment`);
  return response.data;
}

/**
 * Submit an argument
 */
export async function submitArgument(
  caseId: string,
  side: 'A' | 'B',
  argument: string
): Promise<ArgumentResponse> {
  const response = await api.post(`/cases/${caseId}/arguments`, {
    side,
    argument,
  });
  return response.data;
}

/**
 * Get all arguments for a case
 */
export async function getArguments(caseId: string): Promise<{
  arguments: ArgumentRecord[];
  count: number;
  remainingArguments: number;
}> {
  const response = await api.get(`/cases/${caseId}/arguments`);
  return response.data;
}

/**
 * Get case details
 */
export async function getCase(caseId: string): Promise<any> {
  const response = await api.get(`/cases/${caseId}`);
  return response.data;
}

/**
 * Generate final verdict after all arguments
 */
export async function generateFinalVerdict(caseId: string): Promise<Judgment> {
  const response = await api.post(`/cases/${caseId}/final-verdict`);
  return response.data;
}

export default api;
