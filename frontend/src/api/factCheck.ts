import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface DocumentFacts {
  dates: string[];
  amounts: string[];
  names: string[];
  locations: string[];
  rawText: string;
}

export interface FactCheckResult {
  claim: string;
  isValid: boolean;
  confidence: number;
  evidence?: string;
  suggestion?: string;
  category: 'factual_error' | 'inconsistency' | 'missing_evidence' | 'valid';
}

export interface ValidationResult {
  hasIssues: boolean;
  issues: FactCheckResult[];
  overallScore: number;
}

/**
 * Extract facts from document text
 */
export async function extractFacts(documentText: string): Promise<DocumentFacts> {
  const response = await axios.post(`${API_BASE_URL}/fact-check/extract`, {
    documentText,
  });
  return response.data.facts;
}

/**
 * Validate argument against document facts
 */
export async function validateArgument(
  argument: string,
  documentFacts: DocumentFacts
): Promise<ValidationResult> {
  const response = await axios.post(`${API_BASE_URL}/fact-check/validate`, {
    argument,
    documentFacts,
  });
  return response.data.validation;
}

/**
 * Check specific claim
 */
export async function checkClaim(
  claim: string,
  documentFacts: DocumentFacts,
  allDocumentTexts?: string[]
): Promise<FactCheckResult> {
  const response = await axios.post(`${API_BASE_URL}/fact-check/claim`, {
    claim,
    documentFacts,
    allDocumentTexts: allDocumentTexts || [],
  });
  return response.data.result;
}
