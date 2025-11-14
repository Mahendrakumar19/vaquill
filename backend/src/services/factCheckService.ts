import { llmService } from './llmService';
import { logger } from '../utils/logger';

/**
 * Fact Check Service
 * Real-time validation of claims against submitted evidence documents
 */

export interface FactCheckResult {
  claim: string;
  isValid: boolean;
  confidence: number; // 0-100
  evidence?: string;
  suggestion?: string;
  category: 'factual_error' | 'inconsistency' | 'missing_evidence' | 'valid';
}

export interface DocumentFacts {
  dates: string[];
  amounts: string[];
  names: string[];
  locations: string[];
  rawText: string;
}

class FactCheckService {
  /**
   * Extract structured facts from document text using LLM
   */
  async extractFactsFromDocument(documentText: string): Promise<DocumentFacts> {
    try {
      const prompt = `Extract key facts from this legal document. Return ONLY valid JSON with no markdown formatting.

Document:
"""
${documentText.substring(0, 3000)} // Limit for token efficiency
"""

Extract and return in this exact JSON format:
{
  "dates": ["array of dates found"],
  "amounts": ["array of monetary amounts"],
  "names": ["array of person/company names"],
  "locations": ["array of places mentioned"],
  "rawText": "brief summary in 200 words"
}`;

      let responseText: string;
      
      // Use Gemini directly (same as main LLM service)
      switch (llmService['provider']) {
        case 'gemini':
          const model = llmService['geminiClient']!.getGenerativeModel({ 
            model: 'gemini-2.0-flash-exp'
          });
          const geminiResult = await model.generateContent(prompt);
          responseText = geminiResult.response.text();
          break;
        default:
          // Fallback for other providers - use same method as generateJudgment
          throw new Error('Fact checking currently only supports Gemini provider');
      }
      
      // Clean response and parse JSON
      let jsonText = responseText.trim();
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const facts = JSON.parse(jsonText);

      logger.info('Facts extracted from document', { 
        factCount: {
          dates: facts.dates?.length || 0,
          amounts: facts.amounts?.length || 0,
          names: facts.names?.length || 0,
          locations: facts.locations?.length || 0
        }
      });

      return {
        dates: facts.dates || [],
        amounts: facts.amounts || [],
        names: facts.names || [],
        locations: facts.locations || [],
        rawText: facts.rawText || documentText.substring(0, 500)
      };
    } catch (error: any) {
      logger.error('Error extracting facts from document', { error: error.message });
      
      // Fallback: return basic structure
      return {
        dates: [],
        amounts: [],
        names: [],
        locations: [],
        rawText: documentText.substring(0, 500)
      };
    }
  }

  /**
   * Check a single claim against documented facts
   */
  async checkClaim(
    claim: string,
    documentFacts: DocumentFacts,
    _allDocumentTexts: string[]
  ): Promise<FactCheckResult> {
    try {
      const prompt = `You are a fact-checking AI for legal arguments. Verify if the claim is supported by the evidence.

CLAIM: "${claim}"

EXTRACTED FACTS:
- Dates mentioned: ${documentFacts.dates.join(', ') || 'None'}
- Amounts mentioned: ${documentFacts.amounts.join(', ') || 'None'}
- Names mentioned: ${documentFacts.names.join(', ') || 'None'}
- Locations mentioned: ${documentFacts.locations.join(', ') || 'None'}

DOCUMENT SUMMARY:
${documentFacts.rawText}

Analyze the claim and return ONLY valid JSON with no markdown formatting:
{
  "isValid": true/false,
  "confidence": 0-100,
  "evidence": "specific evidence supporting or contradicting the claim",
  "suggestion": "if invalid, suggest how to fix the claim",
  "category": "factual_error" | "inconsistency" | "missing_evidence" | "valid"
}

Rules:
- If claim mentions a date/amount not in evidence: "factual_error"
- If claim contradicts evidence: "inconsistency"  
- If claim lacks supporting evidence: "missing_evidence"
- If claim is supported: "valid"`;

      let responseText: string;
      
      // Use Gemini directly
      switch (llmService['provider']) {
        case 'gemini':
          const model = llmService['geminiClient']!.getGenerativeModel({ 
            model: 'gemini-2.0-flash-exp'
          });
          const geminiResult = await model.generateContent(prompt);
          responseText = geminiResult.response.text();
          break;
        default:
          throw new Error('Fact checking currently only supports Gemini provider');
      }
      
      // Clean and parse response
      let jsonText = responseText.trim();
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const result = JSON.parse(jsonText);

      logger.info('Claim fact-checked', { 
        claim: claim.substring(0, 100),
        isValid: result.isValid,
        category: result.category
      });

      return {
        claim,
        isValid: result.isValid ?? true,
        confidence: result.confidence ?? 50,
        evidence: result.evidence || 'No specific evidence found',
        suggestion: result.suggestion,
        category: result.category || 'valid'
      };
    } catch (error: any) {
      logger.error('Error checking claim', { error: error.message, claim });
      
      // Fallback: assume valid but low confidence
      return {
        claim,
        isValid: true,
        confidence: 30,
        category: 'valid',
        suggestion: 'Unable to verify - fact check service error'
      };
    }
  }

  /**
   * Batch check multiple claims from an argument
   */
  async checkArgument(
    argument: string,
    documentFacts: DocumentFacts,
    allDocumentTexts: string[]
  ): Promise<FactCheckResult[]> {
    try {
      // Extract individual claims from argument
      const claims = this.extractClaims(argument);
      
      logger.info('Checking argument claims', { claimCount: claims.length });

      // Check each claim (limit to 5 to avoid long processing)
      const results: FactCheckResult[] = [];
      const maxClaims = Math.min(claims.length, 5);

      for (let i = 0; i < maxClaims; i++) {
        const result = await this.checkClaim(claims[i], documentFacts, allDocumentTexts);
        results.push(result);
      }

      return results;
    } catch (error: any) {
      logger.error('Error checking argument', { error: error.message });
      return [];
    }
  }

  /**
   * Extract individual verifiable claims from argument text
   */
  private extractClaims(argument: string): string[] {
    // Split by sentences and filter meaningful claims
    const sentences = argument
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20); // Skip very short sentences

    // Take first 5 sentences as claims
    return sentences.slice(0, 5);
  }

  /**
   * Validate argument in real-time (called as user types)
   */
  async validateArgumentRealTime(
    partialArgument: string,
    documentFacts: DocumentFacts
  ): Promise<{
    hasIssues: boolean;
    issues: FactCheckResult[];
    overallScore: number; // 0-100
  }> {
    try {
      // Only check if argument is substantial (> 50 chars)
      if (partialArgument.length < 50) {
        return { hasIssues: false, issues: [], overallScore: 100 };
      }

      const results = await this.checkArgument(partialArgument, documentFacts, []);
      
      // Filter only invalid claims
      const issues = results.filter(r => !r.isValid || r.confidence < 60);
      
      // Calculate overall score
      const avgConfidence = results.length > 0
        ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
        : 100;

      return {
        hasIssues: issues.length > 0,
        issues,
        overallScore: Math.round(avgConfidence)
      };
    } catch (error: any) {
      logger.error('Error in real-time validation', { error: error.message });
      return { hasIssues: false, issues: [], overallScore: 100 };
    }
  }
}

export const factCheckService = new FactCheckService();
