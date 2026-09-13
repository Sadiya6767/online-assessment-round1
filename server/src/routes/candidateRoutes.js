import { Router } from 'express';
import { registerCandidate } from '../controllers/candidateController.js';
import { uploadResume } from '../middleware/upload.js';

const router = Router();

// Handle candidate registration with resume upload
router.post('/register', (req, res, next) => {
  uploadResume.single('resume')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, registerCandidate);

export default router;
