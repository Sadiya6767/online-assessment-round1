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
 * Manual purge endpoint handler (if admin explicitly triggers it)
 */
export async function purgeExpiredRecords() {
  try {
    const cutoffTime = new Date(Date.now() - RETENTION_MS).toISOString();

    const expiredCandidates = await db.all(`
      SELECT id, full_name, resume_file_path, created_at 
      FROM candidates 
      WHERE created_at < ?
    `, [cutoffTime]);

    if (expiredCandidates.length === 0) {
      return { purgedCount: 0, message: 'No records older than retention threshold found.' };
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

      await db.run('DELETE FROM candidates WHERE id = ?', [cand.id]);
    }

    console.log(`Auto-Retention Cleanup: Purged ${expiredCandidates.length} candidate records.`);

    return {
      purgedCount: expiredCandidates.length,
      deletedFiles,
      cutoffTime,
      message: `Successfully purged ${expiredCandidates.length} records.`
    };
  } catch (error) {
    console.error('Error during cleanup:', error);
    return { error: error.message };
  }
}

/**
 * Retention cron is disabled by default to prevent unwanted data loss
 */
export function initRetentionCleanupCron() {
  console.log('🛡️ Auto-purge cron is disabled to protect candidate records.');
}
