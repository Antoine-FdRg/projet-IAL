import { Router } from 'express';
import { FamilyAnalysisController } from '../controllers/familyAnalysisController.js';
import { DoctorAnalysisController } from '../controllers/doctorAnalysisController.js';

const router = Router();

/**
 * GET /analyse/:stationId/family
 * Family analysis endpoint (7 days)
 */
router.get('/:stationId/family', FamilyAnalysisController.getAnalysis);

/**
 * GET /analyse/:stationId/doctor
 * Doctor analysis endpoint (24 hours)
 */
router.get('/:stationId/doctor', DoctorAnalysisController.getAnalysis);

export default router;
