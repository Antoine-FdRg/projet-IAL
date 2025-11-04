import type { Request, Response, NextFunction } from 'express';
import { FamilyAnalysisService } from '../services/familyAnalysisService.js';
import { BoxRepository } from '../database/boxRepository.js';

/**
 * Controller for family analysis endpoint
 */
export class FamilyAnalysisController {
  /**
   * GET /analyse/:stationId/family
   */
  static async getAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { stationId } = req.params;

      // Validate UUID format
      if (!isValidUUID(stationId)) {
        res.status(400).json({ error: 'Invalid stationId format' });
        return;
      }

      // Check if box exists
      const boxExists = await BoxRepository.exists(stationId);
      if (!boxExists) {
        res.status(404).json({ error: 'boxId introuvable' });
        return;
      }

      // Perform family analysis
      const result = await FamilyAnalysisService.analyze(stationId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
