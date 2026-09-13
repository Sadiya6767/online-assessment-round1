import { Router } from 'express';
import {
  adminLogin,
  getDashboardStats,
  getCandidates,
  getCandidateDetails,
  downloadResume,
  exportCSV,
  deleteCandidate,
  triggerRetentionPurge
} from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = Router();

// Public Admin Login
router.post('/login', adminLogin);

// Protected Admin Endpoints
router.use(authenticateAdmin);

router.get('/stats', getDashboardStats);
router.get('/candidates', getCandidates);
router.get('/candidate/:id', getCandidateDetails);
router.get('/resume/:filename', downloadResume);
router.get('/export-csv', exportCSV);
router.delete('/candidate/:id', deleteCandidate);
router.post('/purge-expired', triggerRetentionPurge);

export default router;
