import express, { Request, Response } from 'express';
import { factCheckService, DocumentFacts } from '../services/factCheckService';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Extract facts from case documents
 * POST /api/fact-check/extract
 */
router.post('/extract', async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentText } = req.body;

    if (!documentText) {
      res.status(400).json({ error: 'Document text is required' });
      return;
    }

    const facts = await factCheckService.extractFactsFromDocument(documentText);

    res.json({
      success: true,
      facts
    });
  } catch (error: any) {
    logger.error('Error in fact extraction endpoint', { error: error.message });
    res.status(500).json({ error: 'Failed to extract facts' });
  }
});

/**
 * Validate argument against document facts
 * POST /api/fact-check/validate
 */
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { argument, documentFacts } = req.body;

    if (!argument || !documentFacts) {
      res.status(400).json({ error: 'Argument and documentFacts are required' });
      return;
    }

    const validation = await factCheckService.validateArgumentRealTime(
      argument,
      documentFacts as DocumentFacts
    );

    res.json({
      success: true,
      validation
    });
  } catch (error: any) {
    logger.error('Error in fact validation endpoint', { error: error.message });
    res.status(500).json({ error: 'Failed to validate argument' });
  }
});

/**
 * Check specific claim against facts
 * POST /api/fact-check/claim
 */
router.post('/claim', async (req: Request, res: Response): Promise<void> => {
  try {
    const { claim, documentFacts, allDocumentTexts } = req.body;

    if (!claim || !documentFacts) {
      res.status(400).json({ error: 'Claim and documentFacts are required' });
      return;
    }

    const result = await factCheckService.checkClaim(
      claim,
      documentFacts as DocumentFacts,
      allDocumentTexts || []
    );

    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    logger.error('Error in claim check endpoint', { error: error.message });
    res.status(500).json({ error: 'Failed to check claim' });
  }
});

export default router;
