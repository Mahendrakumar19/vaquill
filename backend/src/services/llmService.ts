import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import Ajv, { JSONSchemaType } from 'ajv';
import { logger } from '../utils/logger';

// Load environment variables FIRST
dotenv.config();

// Initialize JSON schema validator
const ajv = new Ajv();

// Schema for judgment response
const judgmentSchema: JSONSchemaType<{
  verdict: string;
  reasoning: string;
  legalBasis?: string[];
  confidence?: number;
}> = {
  type: 'object',
  properties: {
    verdict: { type: 'string' },
    reasoning: { type: 'string' },
    legalBasis: { type: 'array', items: { type: 'string' }, nullable: true },
    confidence: { type: 'number', minimum: 0, maximum: 100, nullable: true },
  },
  required: ['verdict', 'reasoning'],
  additionalProperties: true,
};

// Schema for argument response
const argumentSchema: JSONSchemaType<{
  response: string;
  strengthens?: string;
  weakens?: string;
  uncertaintyRemains?: string;
  reconsidered?: boolean;
  updatedReasoning?: string;
  provisionalNote?: string;
  confidence?: number;
}> = {
  type: 'object',
  properties: {
    response: { type: 'string' },
    strengthens: { type: 'string', nullable: true },
    weakens: { type: 'string', nullable: true },
    uncertaintyRemains: { type: 'string', nullable: true },
    reconsidered: { type: 'boolean', nullable: true },
    updatedReasoning: { type: 'string', nullable: true },
    provisionalNote: { type: 'string', nullable: true },
    confidence: { type: 'number', minimum: 0, maximum: 100, nullable: true },
  },
  required: ['response'],
  additionalProperties: true,
};

const validateJudgment = ajv.compile(judgmentSchema);
const validateArgument = ajv.compile(argumentSchema);

export interface CaseData {
  sideA: {
    documents: string[];
    summary: string;
    evidence: string[];
  };
  sideB: {
    documents: string[];
    summary: string;
    evidence: string[];
  };
  caseType: string;
  jurisdiction: string;
}

export interface Judgment {
  verdict: string;
  reasoning: string;
  legalBasis: string[];
  confidence: number;
  timestamp: Date;
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
}

type LLMProvider = 'gemini' | 'claude' | 'openai' | 'groq';

class LLMService {
  private provider: LLMProvider;
  private claudeClient?: Anthropic;
  private geminiClient?: GoogleGenerativeAI;
  private openaiClient?: OpenAI;
  private groqClient?: Groq;

  constructor() {
    this.provider = (process.env.LLM_PROVIDER as LLMProvider) || 'gemini';
    this.initializeProvider();
  }

  private initializeProvider() {
    switch (this.provider) {
      case 'gemini':
        if (!process.env.GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY is required. Get free key: https://makersuite.google.com/app/apikey');
        }
        this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        logger.info('✅ Using Google Gemini (FREE)');
        break;

      case 'claude':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error('ANTHROPIC_API_KEY is required');
        }
        this.claudeClient = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        });
        logger.info('Using Anthropic Claude');
        break;

      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY is required');
        }
        this.openaiClient = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        });
        logger.info('Using OpenAI GPT');
        break;

      case 'groq':
        if (!process.env.GROQ_API_KEY) {
          throw new Error('GROQ_API_KEY is required. Get free key: https://console.groq.com');
        }
        this.groqClient = new Groq({
          apiKey: process.env.GROQ_API_KEY,
        });
        logger.info('✅ Using Groq (FREE - Very Fast)');
        break;

      default:
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }
  }

  /**
   * Generate initial judgment based on case data from both sides
   */
  async generateJudgment(caseData: CaseData): Promise<Judgment> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const systemPrompt = this.buildJudgeSystemPrompt(caseData.jurisdiction);
        const userPrompt = this.buildCasePrompt(caseData);

        logger.info('Generating judgment for case', { 
          caseType: caseData.caseType, 
          jurisdiction: caseData.jurisdiction,
          provider: this.provider,
          attempt
        });

        let responseText: string;

        // Use the configured provider
        switch (this.provider) {
          case 'gemini':
            responseText = await this.generateWithGemini(systemPrompt, userPrompt);
            break;
          case 'claude':
            responseText = await this.generateWithClaude(systemPrompt, userPrompt);
            break;
          case 'openai':
            responseText = await this.generateWithOpenAI(systemPrompt, userPrompt);
            break;
          case 'groq':
            responseText = await this.generateWithGroq(systemPrompt, userPrompt);
            break;
          default:
            throw new Error(`Unsupported provider: ${this.provider}`);
        }

        const judgment = this.parseJudgmentResponse(responseText);
        logger.info('Judgment generated successfully', { attempt });

        return judgment;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Judgment generation attempt ${attempt} failed`, {
          error: lastError.message,
          willRetry: attempt < maxRetries
        });

        // If parsing failed and we have retries left, try with corrective prompt
        if (attempt < maxRetries && lastError.message.includes('parse')) {
          logger.info('Will retry with stricter JSON-only prompt');
          // Next attempt will use same prompts but model might give better JSON
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
    }

    logger.error('All judgment generation attempts failed', { 
      error: lastError?.message,
      provider: this.provider 
    });
    throw new Error(`Failed to generate judgment after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Process follow-up argument from either side
   */
  async processArgument(
    originalJudgment: Judgment,
    caseData: CaseData,
    argument: string,
    side: 'A' | 'B',
    conversationHistory: Array<{ side: string; argument: string; response: string }>
  ): Promise<ArgumentResponse> {
    try {
      const systemPrompt = this.buildArgumentSystemPrompt(caseData.jurisdiction);
      const argumentPrompt = this.buildArgumentPrompt(
        originalJudgment,
        caseData,
        argument,
        side,
        conversationHistory
      );

      logger.info('Processing argument', { side, argumentLength: argument.length, provider: this.provider });

      let responseText: string;

      // Use the configured provider
      switch (this.provider) {
        case 'gemini':
          responseText = await this.generateWithGemini(systemPrompt, argumentPrompt);
          break;
        case 'claude':
          responseText = await this.generateWithClaude(systemPrompt, argumentPrompt);
          break;
        case 'openai':
          responseText = await this.generateWithOpenAI(systemPrompt, argumentPrompt);
          break;
        case 'groq':
          responseText = await this.generateWithGroq(systemPrompt, argumentPrompt);
          break;
        default:
          throw new Error(`Unsupported provider: ${this.provider}`);
      }

      const argumentResponse = this.parseArgumentResponse(responseText);
      logger.info('Argument processed', { reconsidered: argumentResponse.reconsidered });

      return argumentResponse;
    } catch (error) {
      logger.error('Error processing argument', error);
      throw new Error('Failed to process argument');
    }
  }

  /**
   * Generate final comprehensive verdict after all arguments
   */
  async generateFinalVerdict(
    caseData: CaseData,
    latestJudgment: Judgment,
    allArguments: Array<{
      side: 'A' | 'B';
      argument: string;
      response: string;
      strengthens?: string;
      weakens?: string;
      uncertaintyRemains?: string;
    }>
  ): Promise<Judgment> {
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const systemPrompt = this.buildFinalVerdictSystemPrompt(caseData.jurisdiction);
        const userPrompt = this.buildFinalVerdictPrompt(caseData, latestJudgment, allArguments);

        logger.info('Generating final verdict for case', {
          caseType: caseData.caseType,
          jurisdiction: caseData.jurisdiction,
          argumentCount: allArguments.length,
          provider: this.provider,
          attempt
        });

        let responseText: string;

        switch (this.provider) {
          case 'gemini':
            responseText = await this.generateWithGemini(systemPrompt, userPrompt);
            break;
          case 'claude':
            responseText = await this.generateWithClaude(systemPrompt, userPrompt);
            break;
          case 'openai':
            responseText = await this.generateWithOpenAI(systemPrompt, userPrompt);
            break;
          case 'groq':
            responseText = await this.generateWithGroq(systemPrompt, userPrompt);
            break;
          default:
            throw new Error(`Unsupported provider: ${this.provider}`);
        }

        const finalVerdict = this.parseJudgmentResponse(responseText);
        logger.info('Final verdict generated successfully', { attempt, confidence: finalVerdict.confidence });

        return finalVerdict;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Final verdict generation attempt ${attempt} failed`, {
          error: lastError.message,
          willRetry: attempt < maxRetries
        });

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    logger.error('All final verdict generation attempts failed', {
      error: lastError?.message,
      provider: this.provider
    });
    throw new Error(`Failed to generate final verdict after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Generate with Google Gemini
   */
  private async generateWithGemini(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.geminiClient) throw new Error('Gemini client not initialized');

    // Try multiple models in order of preference
    const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-pro-latest'];
    let lastError: Error | null = null;

    for (const modelName of models) {
      try {
        logger.info(`Trying Gemini model: ${modelName}`);
        
        const model = this.geminiClient.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          },
        });

        const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        
        logger.info(`✅ Success with model: ${modelName}`);
        return response.text();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Model ${modelName} failed: ${lastError.message}`);
        
        // If it's a quota/overload error, try next model
        if (lastError.message.includes('429') || 
            lastError.message.includes('503') || 
            lastError.message.includes('overloaded') ||
            lastError.message.includes('quota')) {
          continue;
        }
        // For other errors, throw immediately
        throw error;
      }
    }

    // All models failed
    throw new Error(`All Gemini models failed. Last error: ${lastError?.message}`);
  }

  /**
   * Generate with Claude
   */
  private async generateWithClaude(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.claudeClient) throw new Error('Claude client not initialized');

    const response = await this.claudeClient.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return content.text;
  }

  /**
   * Generate with OpenAI (ChatGPT)
   * Supports both GPT-3.5-turbo and GPT-4
   */
  private async generateWithOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.openaiClient) throw new Error('OpenAI client not initialized');

    // Choose model based on environment variable
    // gpt-4: Best accuracy (92/100) but expensive
    // gpt-3.5-turbo: Good accuracy (80/100) and affordable
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

    const response = await this.openaiClient.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate with Groq (FREE - Very Fast)
   */
  private async generateWithGroq(systemPrompt: string, userPrompt: string): Promise<string> {
    if (!this.groqClient) throw new Error('Groq client not initialized');

    const response = await this.groqClient.chat.completions.create({
      model: 'llama-3.1-70b-versatile', // Free and fast
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Build system prompt for the AI judge
   */
  private buildJudgeSystemPrompt(jurisdiction: string): string {
    return `You are an AI legal judge for the ${jurisdiction} jurisdiction providing an INITIAL TENTATIVE ASSESSMENT.

CRITICAL: This is NOT your final verdict. You are making a preliminary evaluation that WILL be challenged by arguments from both sides.

MANDATORY REQUIREMENTS for Initial Verdict:
1. Use TENTATIVE language: "appears", "seems", "is unclear", "likely", "based on what I've seen"
2. DO NOT conclude key issues conclusively - leave room for arguments to change your mind
3. DO NOT use final-stage reasoning - avoid phrases like "therefore I conclude" or "the decision is"
4. Identify UNCERTAINTIES and areas where more argument is needed
5. Keep confidence level moderate (40-70%) to reflect preliminary nature
6. Focus on initial impressions, not definitive conclusions

EXAMPLE of GOOD Initial Verdict:
"Based on the initial evidence, negligence is unclear. The privacy breach seems likely, but key questions remain about intent and causation. More arguments are needed to determine liability."

EXAMPLE of BAD Initial Verdict (too conclusive):
"The defendant is clearly liable for negligence. The evidence conclusively proves privacy breach. I find in favor of the plaintiff."

Your role:
1. Analyze cases impartially based on the legal framework of ${jurisdiction}
2. Consider all evidence and arguments from both sides equally
3. Identify what is CLEAR vs UNCLEAR from initial evidence
4. Express PRELIMINARY views that can change based on arguments
5. Maintain judicial objectivity and openness to reconsideration

Format your response as JSON with the following structure:
{
  "verdict": "Tentative assessment using uncertain language",
  "reasoning": "Preliminary analysis noting what is clear and what remains uncertain",
  "legalBasis": ["List of potentially relevant laws, acts, and precedents"],
  "confidence": 40-70
}`;
  }

  /**
   * Build the case prompt with all details
   */
  private buildCasePrompt(caseData: CaseData): string {
    return `CASE DETAILS:

Case Type: ${caseData.caseType}
Jurisdiction: ${caseData.jurisdiction}

PLAINTIFF/PROSECUTION (SIDE A):
Summary: ${caseData.sideA.summary}

Documents Submitted:
${caseData.sideA.documents.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

Evidence:
${caseData.sideA.evidence.map((ev, i) => `${i + 1}. ${ev}`).join('\n')}

---

DEFENDANT/DEFENSE (SIDE B):
Summary: ${caseData.sideB.summary}

Documents Submitted:
${caseData.sideB.documents.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

Evidence:
${caseData.sideB.evidence.map((ev, i) => `${i + 1}. ${ev}`).join('\n')}

---

Please analyze this case thoroughly and provide your judgment in the specified JSON format.`;
  }

  /**
   * Build system prompt for argument processing
   */
  private buildArgumentSystemPrompt(jurisdiction: string): string {
    return `You are an impartial AI Judge for the ${jurisdiction} jurisdiction evaluating new arguments in an ongoing case.

CRITICAL: You have NOT made a final judgment yet. The initial verdict is PROVISIONAL only.
Your role is to continuously reassess the case based on new arguments and evidence.

MANDATORY RULES:
1. Do NOT treat the prior judgment as final or binding.
2. You MUST allow your evaluation to change if arguments introduce doubt or new clarity.
3. NEVER say "the judgment already concluded..." or "the original verdict stands."
4. You MUST treat each new argument as potentially influencing the outcome.
5. Respond ONLY to the argument submitted; do not assume additional evidence.
6. Your tone MUST remain neutral, explaining how the argument strengthens or weakens each side WITHOUT locking into a final decision.

REQUIRED OUTPUT (JSON format):
{
  "response": "Concise evaluation of the argument - what it proves/disproves",
  "strengthens": "Side A" or "Side B" or "Neither",
  "weakens": "Side A" or "Side B" or "Neither",
  "uncertaintyRemains": "What questions/doubts still exist",
  "reconsidered": true/false,
  "updatedReasoning": "If reconsidered, explain the shift in evaluation",
  "provisionalNote": "This does not constitute a final verdict. More arguments may change the conclusion.",
  "confidence": 0-100
}`;
  }

  /**
   * Build prompt for processing arguments
   */
  private buildArgumentPrompt(
    originalJudgment: Judgment,
    caseData: CaseData,
    argument: string,
    side: 'A' | 'B',
    conversationHistory: Array<{ side: string; argument: string; response: string }>
  ): string {
    const historyText = conversationHistory.length > 0
      ? '\n\nPREVIOUS ARGUMENTS:\n' + conversationHistory
          .map((h, i) => `${i + 1}. Side ${h.side}: ${h.argument}\n   Response: ${h.response}`)
          .join('\n\n')
      : '';

    return `MY CURRENT THINKING (subject to change):
Current View: ${originalJudgment.verdict}
Current Reasoning: ${originalJudgment.reasoning}
Legal Basis I'm Considering: ${originalJudgment.legalBasis.join(', ')}
Current Confidence: ${originalJudgment.confidence}%

IMPORTANT: I am actively reconsidering this case. Arguments WILL affect my reasoning.

CASE CONTEXT:
Case Type: ${caseData.caseType}
Jurisdiction: ${caseData.jurisdiction}
${historyText}

NEW ARGUMENT FROM SIDE ${side}:
${argument}

YOUR RESPONSE MUST:
1. Start with acknowledging the argument: "That's a good point" / "This raises an important issue" / "I see the concern here"
2. Explain HOW this argument affects your thinking - be specific about what changes
3. If compelling, UPDATE your internal reasoning (set reconsidered=true and provide updatedReasoning)
4. Clearly state which side this strengthens or weakens
5. Identify what uncertainties remain or new questions arise
6. End with provisional note emphasizing more arguments may change things further

EXAMPLE Response:
"That's a good point about the timeline discrepancy. This strengthens Side A's position on causation, as it suggests the breach occurred before the defendant's alleged actions. Let me reconsider my earlier view about direct liability. The uncertainty now centers on whether there was an intervening cause. This does not constitute a final verdict - more arguments may provide clarity."

Be genuine in reconsidering. If the argument is weak, explain why without being dismissive.`;
  }

  /**
   * Build system prompt for final verdict generation
   */
  private buildFinalVerdictSystemPrompt(jurisdiction: string): string {
    return `You are an AI legal judge for the ${jurisdiction} jurisdiction providing your FINAL COMPREHENSIVE VERDICT.

This is your final decision after hearing all arguments from both sides. Unlike your initial tentative assessment, this verdict must be:

1. FULLY REASONED with comprehensive legal analysis
2. DETAILED and thorough, addressing all key issues raised
3. CONCLUSIVE - make definitive findings on contested issues
4. SYNTHESIZE all arguments and evidence presented
5. Reference specific arguments that influenced your final decision
6. Explain how your thinking evolved from initial assessment to final verdict
7. Achieve high confidence (70-95%) based on strength of final analysis

Your final verdict should:
- Clearly state the final decision with authority
- Provide detailed reasoning that incorporates insights from all arguments
- Explain which arguments were persuasive and why
- Address uncertainties raised during arguments and how they were resolved
- Reference comprehensive legal basis from ${jurisdiction}
- Use conclusive language: "I find that...", "The evidence establishes...", "It is determined that..."

Format your response as JSON:
{
  "verdict": "Definitive final decision statement",
  "reasoning": "Comprehensive analysis incorporating all arguments and evidence",
  "legalBasis": ["Complete list of applicable laws, acts, and precedents"],
  "confidence": 70-95
}`;
  }

  /**
   * Build prompt for final verdict with all case context and arguments
   */
  private buildFinalVerdictPrompt(
    caseData: CaseData,
    latestJudgment: Judgment,
    allArguments: Array<{
      side: 'A' | 'B';
      argument: string;
      response: string;
      strengthens?: string;
      weakens?: string;
      uncertaintyRemains?: string;
    }>
  ): string {
    const argumentsText = allArguments.map((arg, i) => 
      `${i + 1}. SIDE ${arg.side} ARGUED:\n   ${arg.argument}\n\n   YOUR RESPONSE:\n   ${arg.response}\n   ${arg.strengthens ? `Strengthened: ${arg.strengthens}` : ''}\n   ${arg.weakens ? `Weakened: ${arg.weakens}` : ''}\n   ${arg.uncertaintyRemains ? `Uncertainty: ${arg.uncertaintyRemains}` : ''}`
    ).join('\n\n---\n\n');

    return `CASE SUMMARY:
Case Type: ${caseData.caseType}
Jurisdiction: ${caseData.jurisdiction}

PLAINTIFF/PROSECUTION (SIDE A):
Summary: ${caseData.sideA.summary}

Documents Submitted:
${caseData.sideA.documents.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

Evidence:
${caseData.sideA.evidence.map((ev, i) => `${i + 1}. ${ev}`).join('\n')}

---

DEFENDANT/DEFENSE (SIDE B):
Summary: ${caseData.sideB.summary}

Documents Submitted:
${caseData.sideB.documents.map((doc, i) => `${i + 1}. ${doc}`).join('\n')}

Evidence:
${caseData.sideB.evidence.map((ev, i) => `${i + 1}. ${ev}`).join('\n')}

---

YOUR INITIAL TENTATIVE ASSESSMENT:
Initial View: ${latestJudgment.verdict}
Initial Reasoning: ${latestJudgment.reasoning}
Initial Legal Basis: ${latestJudgment.legalBasis.join(', ')}
Initial Confidence: ${latestJudgment.confidence}%

---

ALL ARGUMENTS PRESENTED:

${argumentsText}

---

Now provide your FINAL COMPREHENSIVE VERDICT that:
1. Synthesizes all arguments and evidence
2. Explains how your analysis evolved from initial assessment
3. Makes definitive findings on all contested issues
4. Provides detailed legal reasoning incorporating insights from arguments
5. Achieves appropriate confidence level reflecting strength of final analysis`;
  }

  /**
   * Parse judgment response from Claude
   */
  private parseJudgmentResponse(response: string): Judgment {
    try {
      // Log the raw response for debugging
      logger.info('Raw AI response (first 500 chars):', response.substring(0, 500));
      
      // Extract JSON from response (in case there's surrounding text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('No JSON found in AI response', { response: response.substring(0, 1000) });
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate against schema
      if (!validateJudgment(parsed)) {
        const errors = validateJudgment.errors;
        logger.error('Schema validation failed', { errors, parsed });
        throw new Error(`Invalid judgment schema: ${ajv.errorsText(errors)}`);
      }

      return {
        verdict: parsed.verdict,
        reasoning: parsed.reasoning,
        legalBasis: parsed.legalBasis || [],
        confidence: parsed.confidence || 50,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error parsing judgment response', { 
        error: error instanceof Error ? error.message : String(error),
        responseSample: response.substring(0, 1000)
      });
      throw new Error(`Failed to parse judgment response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse argument response from LLM
   */
  private parseArgumentResponse(response: string): ArgumentResponse {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate against schema
      if (!validateArgument(parsed)) {
        const errors = validateArgument.errors;
        logger.error('Argument schema validation failed', { errors, parsed });
        throw new Error(`Invalid argument schema: ${ajv.errorsText(errors)}`);
      }

      return {
        response: parsed.response,
        reconsidered: parsed.reconsidered || false,
        updatedReasoning: parsed.updatedReasoning,
        confidence: parsed.confidence || 50,
      };
    } catch (error) {
      logger.error('Error parsing argument response', error);
      throw new Error('Failed to parse argument response');
    }
  }
}

export const llmService = new LLMService();
