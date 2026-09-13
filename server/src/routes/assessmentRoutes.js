import { Router } from 'express';
import {
  startAssessment,
  getCurrentQuestion,
  submitAnswer,
  getAssessmentStatus
} from '../controllers/assessmentController.js';

const router = Router();

// Start 25-minute test countdown and lock question sequence
router.post('/:assessmentId/start', startAssessment);

// Fetch current active question (anti-cheating, score hidden)
router.get('/:assessmentId/current', getCurrentQuestion);

// Submit answer for active question (auto-advance)
router.post('/:assessmentId/answer', submitAnswer);

// Fetch final test completion status (strictly no marks/answers leaked)
router.get('/:assessmentId/status', getAssessmentStatus);

export default router;
