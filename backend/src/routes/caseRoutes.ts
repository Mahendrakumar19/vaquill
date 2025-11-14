import express, { Request, Response } from 'express';
import { upload, extractTextFromFile, deleteFile } from '../services/documentService';
import { llmService } from '../services/llmService';
import { databaseService } from '../services/databaseService';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

const router = express.Router();

const MAX_ARGUMENTS = 5;

/**
 * Create a new case
 * POST /api/cases
 */
router.post(
  '/',
  upload.fields([
    { name: 'sideADocs', maxCount: 10 },
    { name: 'sideBDocs', maxCount: 10 },
  ]),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        caseType,
        jurisdiction,
        sideASummary,
        sideAEvidence,
        sideBSummary,
        sideBEvidence,
      } = req.body;

      // Validate required fields
      if (!caseType || !jurisdiction || !sideASummary || !sideBSummary) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Process uploaded documents
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const sideADocs: string[] = [];
      const sideBDocs: string[] = [];

      // Extract text from Side A documents
      if (files.sideADocs) {
        for (const file of files.sideADocs) {
          try {
            const text = await extractTextFromFile(file.path, file.mimetype);
            sideADocs.push(text);
            deleteFile(file.path); // Clean up after extraction
          } catch (error) {
            logger.error('Error processing Side A document', error);
          }
        }
      }

      // Extract text from Side B documents
      if (files.sideBDocs) {
        for (const file of files.sideBDocs) {
          try {
            const text = await extractTextFromFile(file.path, file.mimetype);
            sideBDocs.push(text);
            deleteFile(file.path);
          } catch (error) {
            logger.error('Error processing Side B document', error);
          }
        }
      }

      // Parse evidence arrays
      const sideAEvidenceArray = sideAEvidence ? JSON.parse(sideAEvidence) : [];
      const sideBEvidenceArray = sideBEvidence ? JSON.parse(sideBEvidence) : [];

      // Create case in database
      const caseId = await databaseService.createCase(
        caseType,
        jurisdiction,
        {
          summary: sideASummary,
          documents: sideADocs,
          evidence: sideAEvidenceArray,
        },
        {
          summary: sideBSummary,
          documents: sideBDocs,
          evidence: sideBEvidenceArray,
        }
      );

      res.status(201).json({
        success: true,
        caseId,
        message: 'Case created successfully',
      });
    } catch (error) {
      logger.error('Error creating case', error);
      res.status(500).json({ error: 'Failed to create case' });
    }
  }
);

/**
 * Get case by ID
 * GET /api/cases/:caseId
 */
router.get('/:caseId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;
    const caseData = await databaseService.getCaseById(caseId);

    if (!caseData) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    res.json(caseData);
  } catch (error) {
    logger.error('Error fetching case', error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

/**
 * Generate judgment for a case
 * POST /api/cases/:caseId/judgment
 */
router.post('/:caseId/judgment', async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;
    
    // Check cache first
    const cacheKey = cacheService.generateCaseKey({ caseId });
    const cachedJudgment = await cacheService.get(cacheKey);

    if (cachedJudgment) {
      logger.info('Returning cached judgment', { caseId });
      res.json({ ...cachedJudgment, cached: true });
      return;
    }

    // Get case details
    const caseData = await databaseService.getCaseById(caseId);
    if (!caseData) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    // Generate judgment using LLM
    const judgment = await llmService.generateJudgment({
      sideA: caseData.sideA,
      sideB: caseData.sideB,
      caseType: caseData.caseType,
      jurisdiction: caseData.jurisdiction,
    });

    // Save judgment to database
    await databaseService.saveJudgment(
      caseId,
      judgment.verdict,
      judgment.reasoning,
      judgment.legalBasis,
      judgment.confidence
    );

    // Cache the judgment
    await cacheService.set(cacheKey, judgment, 3600); // Cache for 1 hour

    res.json({ ...judgment, cached: false });
  } catch (error) {
    logger.error('Error generating judgment', error);
    res.status(500).json({ error: 'Failed to generate judgment' });
  }
});

/**
 * Submit argument for a case
 * POST /api/cases/:caseId/arguments
 */
router.post('/:caseId/arguments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;
    const { side, argument } = req.body;

    // Validate input
    if (!side || !argument || (side !== 'A' && side !== 'B')) {
      res.status(400).json({ error: 'Invalid request. Side must be A or B, and argument is required' });
      return;
    }

    // Check argument limit
    const argumentCount = await databaseService.getArgumentCount(caseId);
    if (argumentCount >= MAX_ARGUMENTS) {
      res.status(400).json({ 
        error: `Maximum number of arguments (${MAX_ARGUMENTS}) reached` 
      });
      return;
    }

    // Get case data and latest judgment
    const caseData = await databaseService.getCaseById(caseId);
    const latestJudgment = await databaseService.getLatestJudgment(caseId);

    if (!caseData || !latestJudgment) {
      res.status(404).json({ error: 'Case or judgment not found' });
      return;
    }

    // Get conversation history
    const previousArguments = await databaseService.getArguments(caseId);
    const conversationHistory = previousArguments.map((arg) => ({
      side: arg.side,
      argument: arg.argument,
      response: arg.response,
    }));

    // Process argument with LLM
    const argumentResponse = await llmService.processArgument(
      {
        verdict: latestJudgment.verdict,
        reasoning: latestJudgment.reasoning,
        legalBasis: latestJudgment.legalBasis,
        confidence: latestJudgment.confidence,
        timestamp: latestJudgment.createdAt,
      },
      {
        sideA: caseData.sideA,
        sideB: caseData.sideB,
        caseType: caseData.caseType,
        jurisdiction: caseData.jurisdiction,
      },
      argument,
      side,
      conversationHistory
    );

    // Save argument to database
    await databaseService.saveArgument(
      caseId,
      side,
      argument,
      argumentResponse.response,
      argumentResponse.reconsidered,
      argumentCount + 1,
      argumentResponse.strengthens,
      argumentResponse.weakens,
      argumentResponse.uncertaintyRemains,
      argumentResponse.provisionalNote
    );

    // If reconsidered, save updated judgment
    if (argumentResponse.reconsidered && argumentResponse.updatedReasoning) {
      await databaseService.saveJudgment(
        caseId,
        latestJudgment.verdict, // Verdict might stay same, reasoning updated
        argumentResponse.updatedReasoning,
        latestJudgment.legalBasis,
        argumentResponse.confidence,
        latestJudgment.version + 1
      );

      // Invalidate cache
      const cacheKey = cacheService.generateCaseKey({ caseId });
      await cacheService.delete(cacheKey);
    }

    res.json({
      ...argumentResponse,
      remainingArguments: MAX_ARGUMENTS - (argumentCount + 1),
    });
  } catch (error) {
    logger.error('Error processing argument', error);
    res.status(500).json({ error: 'Failed to process argument' });
  }
});

/**
 * Get all arguments for a case
 * GET /api/cases/:caseId/arguments
 */
router.get('/:caseId/arguments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;
    const caseArguments = await databaseService.getArguments(caseId);
    const count = caseArguments.length;

    res.json({
      arguments: caseArguments,
      count,
      remainingArguments: MAX_ARGUMENTS - count,
    });
  } catch (error) {
    logger.error('Error fetching arguments', error);
    res.status(500).json({ error: 'Failed to fetch arguments' });
  }
});

/**
 * Generate final verdict after all arguments
 * POST /api/cases/:caseId/final-verdict
 */
router.post('/:caseId/final-verdict', async (req: Request, res: Response): Promise<void> => {
  try {
    const { caseId } = req.params;

    // Get case data
    const caseData = await databaseService.getCase(caseId);
    if (!caseData) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    // Get all judgments and arguments
    const judgments = await databaseService.getJudgments(caseId);
    const caseArguments = await databaseService.getArguments(caseId);

    if (judgments.length === 0) {
      res.status(400).json({ error: 'No initial judgment found. Generate judgment first.' });
      return;
    }

    // Generate comprehensive final verdict
    const finalVerdict = await llmService.generateFinalVerdict(
      caseData,
      judgments[judgments.length - 1],
      caseArguments
    );

    // Save final verdict as new judgment with higher version
    await databaseService.saveJudgment(
      caseId,
      finalVerdict.verdict,
      finalVerdict.reasoning,
      finalVerdict.legalBasis,
      finalVerdict.confidence,
      judgments.length + 1
    );

    // Invalidate cache
    const cacheKey = cacheService.generateCaseKey({ caseId });
    await cacheService.delete(cacheKey);

    res.json(finalVerdict);
  } catch (error) {
    logger.error('Error generating final verdict', error);
    res.status(500).json({ error: 'Failed to generate final verdict' });
  }
});

export default router;
