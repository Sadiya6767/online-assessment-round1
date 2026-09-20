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

export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const admin = await db.get('SELECT * FROM admins WHERE email = ?', [email.trim().toLowerCase()]);
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

export async function getDashboardStats(req, res) {
  try {
    const totalCandidatesRow = await db.get('SELECT COUNT(*) as count FROM candidates');
    const totalAttemptsRow = await db.get("SELECT COUNT(*) as count FROM assessments WHERE status != 'NOT_STARTED'");
    const completedRow = await db.get("SELECT COUNT(*) as count FROM assessments WHERE status = 'COMPLETED'");
    const inProgressRow = await db.get("SELECT COUNT(*) as count FROM assessments WHERE status = 'IN_PROGRESS'");
    const timedOutRow = await db.get("SELECT COUNT(*) as count FROM assessments WHERE status = 'TIMED_OUT'");
    
    // Qualifying criteria: >= 60% of total questions
    const qualifiedRow = await db.get("SELECT COUNT(*) as count FROM assessments WHERE (score * 1.0 / total_questions) >= 0.6 AND status IN ('COMPLETED', 'TIMED_OUT')");
    const avgScoreRow = await db.get("SELECT AVG(score) as \"avgScore\" FROM assessments WHERE status IN ('COMPLETED', 'TIMED_OUT')");

    const totalCandidates = parseInt(totalCandidatesRow?.count || 0, 10);
    const totalAttempts = parseInt(totalAttemptsRow?.count || 0, 10);
    const completed = parseInt(completedRow?.count || 0, 10);
    const inProgress = parseInt(inProgressRow?.count || 0, 10);
    const timedOut = parseInt(timedOutRow?.count || 0, 10);
    const qualified = parseInt(qualifiedRow?.count || 0, 10);
    const averageScore = avgScoreRow && avgScoreRow.avgScore ? Math.round(parseFloat(avgScoreRow.avgScore) * 10) / 10 : 0;

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

export async function triggerRetentionPurge(req, res) {
  try {
    const result = await purgeExpiredRecords();
    return res.json(result);
  } catch (error) {
    console.error('Error in retention purge:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getCandidates(req, res) {
  try {
    const { search, status, gradYear, percentageRange, profile } = req.query;

    let query = `
      SELECT 
        c.id as "candidateId",
        c.full_name as "fullName",
        c.interested_profile as "interestedProfile",
        c.degree,
        c.semester,
        c.year,
        c.branch,
        c.college_name as "collegeName",
        c.graduation_year as "graduationYear",
        c.email,
        c.phone,
        c.resume_file_path as "resumeFilePath",
        c.created_at as "registeredAt",
        a.id as "assessmentId",
        a.status as "testStatus",
        a.score,
        a.total_questions as "totalQuestions",
        a.start_time as "startTime",
        a.submission_time as "submissionTime",
        a.completion_reason as "completionReason",
        COALESCE(a.tab_switch_count, 0) as "tabSwitchCount"
      FROM candidates c
      LEFT JOIN assessments a ON c.id = a.candidate_id
      WHERE 1=1
    `;

    const params = [];

    if (search && search.trim()) {
      query += ` AND (c.full_name ILIKE ? OR c.email ILIKE ? OR c.college_name ILIKE ? OR c.phone ILIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    if (status && status !== 'ALL') {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    if (profile && profile !== 'ALL') {
      query += ` AND c.interested_profile = ?`;
      params.push(profile);
    }

    if (gradYear && gradYear !== 'ALL') {
      query += ` AND c.graduation_year = ?`;
      params.push(gradYear);
    }

    // Percentage Range Filter
    if (percentageRange && percentageRange !== 'ALL') {
      if (percentageRange === '90-100') {
        query += ` AND a.status IN ('COMPLETED', 'TIMED_OUT') AND (a.score * 100.0 / a.total_questions) >= 90`;
      } else if (percentageRange === '75-89') {
        query += ` AND a.status IN ('COMPLETED', 'TIMED_OUT') AND (a.score * 100.0 / a.total_questions) >= 75 AND (a.score * 100.0 / a.total_questions) < 90`;
      } else if (percentageRange === '60-74') {
        query += ` AND a.status IN ('COMPLETED', 'TIMED_OUT') AND (a.score * 100.0 / a.total_questions) >= 60 AND (a.score * 100.0 / a.total_questions) < 75`;
      } else if (percentageRange === '40-59') {
        query += ` AND a.status IN ('COMPLETED', 'TIMED_OUT') AND (a.score * 100.0 / a.total_questions) >= 40 AND (a.score * 100.0 / a.total_questions) < 60`;
      } else if (percentageRange === '0-39') {
        query += ` AND a.status IN ('COMPLETED', 'TIMED_OUT') AND (a.score * 100.0 / a.total_questions) < 40`;
      }
    }

    query += ` ORDER BY c.created_at DESC`;

    const candidates = await db.all(query, params);

    return res.json({
      candidates: candidates.map(c => {
        let durationUsed = '-';
        if (c.startTime && c.submissionTime) {
          const diffSec = Math.max(0, Math.round((new Date(c.submissionTime).getTime() - new Date(c.startTime).getTime()) / 1000));
          const mins = Math.floor(diffSec / 60);
          const secs = diffSec % 60;
          durationUsed = `${mins}m ${secs}s`;
        }
        return {
          ...c,
          durationUsed,
          percentage: c.totalQuestions && c.score !== null ? Math.round((c.score / c.totalQuestions) * 100) : null
        };
      })
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return res.status(500).json({ error: 'Failed to retrieve candidates.' });
  }
}

export async function getCandidateDetails(req, res) {
  try {
    const { id } = req.params;

    const candidate = await db.get(`
      SELECT 
        c.id as "candidateId",
        c.full_name as "fullName",
        c.interested_profile as "interestedProfile",
        c.degree,
        c.semester,
        c.year,
        c.branch,
        c.college_name as "collegeName",
        c.graduation_year as "graduationYear",
        c.email,
        c.phone,
        c.resume_file_path as "resumeFilePath",
        c.created_at as "registeredAt",
        a.id as "assessmentId",
        a.status as "testStatus",
        a.score,
        a.total_questions as "totalQuestions",
        a.start_time as "startTime",
        a.deadline,
        a.submission_time as "submissionTime",
        a.completion_reason as "completionReason",
        COALESCE(a.tab_switch_count, 0) as "tabSwitchCount"
      FROM candidates c
      LEFT JOIN assessments a ON c.id = a.candidate_id
      WHERE c.id = ? OR a.id = ?
    `, [id, id]);

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found.' });
    }

    // Fetch candidate answers
    const answers = await db.all(`
      SELECT 
        ans.question_id as "questionId",
        ans.selected_option as "selectedOption",
        ans.is_correct as "isCorrect",
        ans.answered_at as "answeredAt",
        q.section,
        q.topic,
        q.question_text as "questionText",
        q.option_a as "optionA",
        q.option_b as "optionB",
        q.option_c as "optionC",
        q.option_d as "optionD",
        q.correct_option as "correctOption"
      FROM answers ans
      JOIN questions q ON ans.question_id = q.id
      WHERE ans.assessment_id = ?
      ORDER BY ans.answered_at ASC
    `, [candidate.assessmentId]);

    // Calculate section-wise breakdown for admin
    const sectionStats = {};
    answers.forEach(a => {
      const secName = a.section.replace(/Section [A-Z]:\s*/, '');
      if (!sectionStats[secName]) {
        sectionStats[secName] = { total: 0, correct: 0 };
      }
      sectionStats[secName].total += 1;
      if (a.isCorrect) {
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

export async function exportCSV(req, res) {
  try {
    const rows = await db.all(`
      SELECT 
        c.id as "Candidate_ID",
        c.full_name as "Full_Name",
        c.interested_profile as "Interested_Profile",
        c.email as "Email",
        c.phone as "Phone",
        c.degree as "Degree",
        c.branch as "Branch",
        c.year as "Year",
        c.semester as "Semester",
        c.college_name as "College",
        c.graduation_year as "Graduation_Year",
        a.status as "Status",
        a.score as "Score",
        a.total_questions as "Total_Questions",
        ROUND((a.score * 100.0 / a.total_questions), 1) as "Percentage",
        COALESCE(a.tab_switch_count, 0) as "Tab_Switches",
        a.start_time as "Start_Time",
        a.submission_time as "Submission_Time",
        a.completion_reason as "Completion_Reason"
      FROM candidates c
      LEFT JOIN assessments a ON c.id = a.candidate_id
      ORDER BY c.created_at DESC
    `);

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

export async function deleteCandidate(req, res) {
  try {
    const { id } = req.params;

    const candidate = await db.get('SELECT * FROM candidates WHERE id = ?', [id]);
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

    await db.run('DELETE FROM candidates WHERE id = ?', [id]);

    return res.json({ message: 'Candidate record successfully deleted.' });
  } catch (error) {
    console.error('Delete candidate error:', error);
    return res.status(500).json({ error: 'Failed to delete candidate.' });
  }
}
