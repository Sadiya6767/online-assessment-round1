import db from '../database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

const RETENTION_HOURS = parseInt(process.env.RETENTION_HOURS || '24', 10);
const RETENTION_MS = RETENTION_HOURS * 60 * 60 * 1000;

/**
 * Automatically purges candidate records and uploaded resumes older than 24 hours.
 */
export function purgeExpiredRecords() {
  try {
    const cutoffTime = new Date(Date.now() - RETENTION_MS).toISOString();

    // Find candidates registered before cutoff time
    const expiredCandidates = db.prepare(`
      SELECT id, full_name, resume_file_path, created_at 
      FROM candidates 
      WHERE created_at < ?
    `).all(cutoffTime);

    if (expiredCandidates.length === 0) {
      return { purgedCount: 0, message: 'No records older than 24 hours found.' };
    }

    let deletedFiles = 0;
    for (const cand of expiredCandidates) {
      if (cand.resume_file_path) {
        const filePath = path.join(uploadDir, path.basename(cand.resume_file_path));
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            deletedFiles++;
          } catch (e) {
            console.warn(`Could not delete resume file for ${cand.id}:`, e.message);
          }
        }
      }

      // Deleting candidate triggers CASCADE delete on assessments and answers
      db.prepare('DELETE FROM candidates WHERE id = ?').run(cand.id);
    }

    console.log(`🧹 Auto-Retention Cleanup: Purged ${expiredCandidates.length} expired candidate records and ${deletedFiles} resumes (>24h old).`);

    return {
      purgedCount: expiredCandidates.length,
      deletedFiles,
      cutoffTime,
      message: `Successfully purged ${expiredCandidates.length} records older than ${RETENTION_HOURS} hours.`
    };
  } catch (error) {
    console.error('Error during auto-retention cleanup:', error);
    return { error: error.message };
  }
}

/**
 * Initializes automatic background interval running every 30 minutes.
 */
export function initRetentionCleanupCron() {
  console.log(`🛡️ 24-Hour Data Retention Policy active (records auto-purge after ${RETENTION_HOURS} hours).`);
  
  // Run once on startup
  purgeExpiredRecords();

  // Run automatically every 30 minutes
  const INTERVAL_MS = 30 * 60 * 1000;
  setInterval(() => {
    purgeExpiredRecords();
  }, INTERVAL_MS);
}
