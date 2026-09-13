import db from '../database.js';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { signAdminToken } from '../middleware/auth.js';
import { purgeExpiredRecords } from '../services/cleanupService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', '..', 'uploads');

export function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email.trim().toLowerCase());
    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const isMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const token = signAdminToken(admin);

    return res.json({
      message: 'Admin authentication successful',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}

export function getDashboardStats(req, res) {
  try {
    const totalCandidates = db.prepare('SELECT COUNT(*) as count FROM candidates').get().count;
    const totalAttempts = db.prepare("SELECT COUNT(*) as count FROM assessments WHERE status != 'NOT_STARTED'").get().count;
    const completed = db.prepare("SELECT COUNT(*) as count FROM assessments WHERE status = 'COMPLETED'").get().count;
    const inProgress = db.prepare("SELECT COUNT(*) as count FROM assessments WHERE status = 'IN_PROGRESS'").get().count;
    const timedOut = db.prepare("SELECT COUNT(*) as count FROM assessments WHERE status = 'TIMED_OUT'").get().count;
    
    // Internal qualifying criteria: >= 18 out of 30 (60%)
    const qualified = db.prepare("SELECT COUNT(*) as count FROM assessments WHERE score >= 18 AND status IN ('COMPLETED', 'TIMED_OUT')").get().count;

    const avgScoreRow = db.prepare("SELECT AVG(score) as avgScore FROM assessments WHERE status IN ('COMPLETED', 'TIMED_OUT')").get();
    const averageScore = avgScoreRow && avgScoreRow.avgScore ? Math.round(avgScoreRow.avgScore * 10) / 10 : 0;

    return res.json({
      totalCandidates,
      totalAttempts,
      completed,
      inProgress,
      timedOut,
      qualified,
      averageScore,
      retentionHours: 24
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to retrieve stats.' });
  }
}

export function triggerRetentionPurge(req, res) {
  try {
    const result = purgeExpiredRecords();
    return res.json(result);
  } catch (error) {
    console.error('Error in retention purge:', error);
    return res.status(500).json({ error: error.message });
  }
}

export function getCandidates(req, res) {
  try {
    const { search, status, gradYear, percentageRange } = req.query;

    let query = `
      SELECT 
        c.id as candidateId,
        c.full_name as fullName,
        c.degree,
        c.semester,
        c.year,
        c.branch,
        c.college_name as collegeName,
        c.graduation_year as graduationYear,
        c.email,
        c.phone,
        c.resume_file_path as resumeFilePath,
        c.created_at as registeredAt,
        a.id as assessmentId,
        a.status as testStatus,
        a.score,
        a.total_questions as totalQuestions,
        a.start_time as startTime,
        a.submission_time as submissionTime,
        a.completion_reason as completionReason
      FROM candidates c
      LEFT JOIN assessments a ON c.id = a.candidate_id
      WHERE 1=1
    `;

    const params = [];

    if (search && search.trim()) {
      query += ` AND (c.full_name LIKE ? OR c.email LIKE ? OR c.college_name LIKE ? OR c.phone LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (status && status !== 'ALL') {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (gradYear && gradYear !== 'ALL') {
      query += ` AND c.graduation_year = ?`;
      params.push(gradYear);
    }

    // Percentage Range Filter
    if (percentageRange && percentageRange !== 'ALL') {
      if (percentageRange === '90-100') {
        query += ` AND a.status IN ('COMPLETED', 'TIMED_OUT') AND (CAST(a.score AS FLOAT) / a.total_questions * 100) >= 90`;
      } else if (percentageRange === '75-89') {
        query += ` AND a.status IN ('COMPLETED', 'TIMED_OUT') AND (CAST(a.score AS FLOAT) / a.total_questions * 100) >= 75 AND (CAST(a.score AS FLOAT) / a.total_questions * 100) < 90`;
      } else if (percentageRange === '60-74') {
        query += ` AND a.status IN ('COMPLETED', 'TIMED_OUT') AND (CAST(a.score AS FLOAT) / a.total_questions * 100) >= 60 AND (CAST(a.score AS FLOAT) / a.total_questions * 100) < 75`;
      } else if (percentageRange === '40-59') {
        query += ` AND a.status IN ('COMPLETED', 'TIMED_OUT') AND (CAST(a.score AS FLOAT) / a.total_questions * 100) >= 40 AND (CAST(a.score AS FLOAT) / a.total_questions * 100) < 60`;
      } else if (percentageRange === '0-39') {
        query += ` AND a.status IN ('COMPLETED', 'TIMED_OUT') AND (CAST(a.score AS FLOAT) / a.total_questions * 100) < 40`;
      }
    }

    query += ` ORDER BY c.created_at DESC`;

    const rows = db.prepare(query).all(...params);

    // Format fields with duration and percentage
    const candidates = rows.map(c => {
      let durationUsed = '-';
      if (c.startTime && c.submissionTime) {
        const start = new Date(c.startTime).getTime();
        const end = new Date(c.submissionTime).getTime();
        const diffSec = Math.max(0, Math.floor((end - start) / 1000));
        const mins = Math.floor(diffSec / 60);
        const secs = diffSec % 60;
        durationUsed = `${mins}m ${secs.toString().padStart(2, '0')}s`;
      }

      const percentage = c.totalQuestions ? Math.round((c.score / c.totalQuestions) * 100) : 0;

      return {
        ...c,
        durationUsed,
        percentage
      };
    });

    return res.json({ candidates });
  } catch (error) {
    console.error('Error fetching candidate records:', error);
    return res.status(500).json({ error: 'Failed to retrieve candidates.' });
  }
}

export function getCandidateDetails(req, res) {
  try {
    const { id } = req.params;

    const candidate = db.prepare(`
      SELECT 
        c.*,
        a.id as assessmentId,
        a.status as testStatus,
        a.score,
        a.total_questions as totalQuestions,
        a.start_time as startTime,
        a.submission_time as submissionTime,
        a.completion_reason as completionReason,
        a.question_sequence as questionSequence
      FROM candidates c
      LEFT JOIN assessments a ON c.id = a.candidate_id
      WHERE c.id = ? OR a.id = ?
    `).get(id, id);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    // Fetch candidate answers
    const answers = db.prepare(`
      SELECT 
        ans.question_id,
        ans.selected_option,
        ans.is_correct,
        ans.answered_at,
        q.section,
        q.topic,
        q.question_text,
        q.option_a,
        q.option_b,
        q.option_c,
        q.option_d,
        q.correct_option
      FROM answers ans
      JOIN questions q ON ans.question_id = q.id
      WHERE ans.assessment_id = ?
      ORDER BY ans.answered_at ASC
    `).all(candidate.assessmentId);

    // Calculate section-wise breakdown for admin
    const sectionStats = {};
    answers.forEach(a => {
      const secName = a.section.replace(/Section [A-Z]:\s*/, '');
      if (!sectionStats[secName]) {
        sectionStats[secName] = { total: 0, correct: 0 };
      }
      sectionStats[secName].total += 1;
      if (a.is_correct) {
        sectionStats[secName].correct += 1;
      }
    });

    return res.json({
      candidate,
      answers,
      sectionStats
    });
  } catch (error) {
    console.error('Error fetching candidate details:', error);
    return res.status(500).json({ error: 'Failed to fetch candidate details.' });
  }
}

export function downloadResume(req, res) {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(uploadDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Resume file not found on server.' });
    }

    return res.download(filePath, safeFilename);
  } catch (error) {
    console.error('Resume download error:', error);
    return res.status(500).json({ error: 'Failed to download resume.' });
  }
}

export function exportCSV(req, res) {
  try {
    const rows = db.prepare(`
      SELECT 
        c.id as Candidate_ID,
        c.full_name as Full_Name,
        c.email as Email,
        c.phone as Phone,
        c.degree as Degree,
        c.branch as Branch,
        c.year as Year,
        c.semester as Semester,
        c.college_name as College,
        c.graduation_year as Graduation_Year,
        a.status as Status,
        a.score as Score,
        a.total_questions as Total_Questions,
        ROUND((a.score * 100.0 / a.total_questions), 1) as Percentage,
        a.start_time as Start_Time,
        a.submission_time as Submission_Time,
        a.completion_reason as Completion_Reason
      FROM candidates c
      LEFT JOIN assessments a ON c.id = a.candidate_id
      ORDER BY c.created_at DESC
    `).all();

    if (rows.length === 0) {
      return res.send('No candidate records available for export.');
    }

    const headers = Object.keys(rows[0]).join(',');
    const csvLines = rows.map(row => {
      return Object.values(row).map(val => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(',');
    });

    const csvContent = [headers, ...csvLines].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="candidates_round1_${Date.now()}.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    return res.status(500).json({ error: 'Failed to export CSV.' });
  }
}

export function deleteCandidate(req, res) {
  try {
    const { id } = req.params;

    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ?').get(id);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate record not found.' });
    }

    // Remove file if present
    if (candidate.resume_file_path) {
      const filePath = path.join(uploadDir, path.basename(candidate.resume_file_path));
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.warn('Could not delete resume file:', e);
        }
      }
    }

    db.prepare('DELETE FROM candidates WHERE id = ?').run(id);

    return res.json({ message: 'Candidate record successfully deleted.' });
  } catch (error) {
    console.error('Delete candidate error:', error);
    return res.status(500).json({ error: 'Failed to delete candidate.' });
  }
}
