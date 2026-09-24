import { Router } from 'express';
import { registerCandidate } from '../controllers/candidateController.js';
import { uploadResume } from '../middleware/upload.js';

const router = Router();

// Handle candidate registration with resume upload
router.post('/register', (req, res, next) => {
  uploadResume.single('resume')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Resume file size exceeds the 5MB limit. Please upload a smaller document.' });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, registerCandidate);

export default router;
