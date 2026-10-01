import db from '../database.js';
import crypto from 'crypto';

export const VALID_PROFILES = {
  'Web Development cum Sales Engineer': 'SALES_ENGINEER',
  'Web Development cum HR Recruiter': 'HR_RECRUITER',
  'Web Development cum Digital Marketing': 'DIGITAL_MARKETING'
};

// Cryptographically secure Fisher-Yates shuffle algorithm to ensure unique question sequences per candidate
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function registerCandidate(req, res) {
  try {
    const {
      fullName,
      interestedProfile,
      degree,
      semester,
      year,
      branch,
      collegeName,
      graduationYear,
      email,
      phone,
      consent
    } = req.body;

    const file = req.file;

    // Sanitize candidate input with robust fallbacks
    const cleanName = (fullName && fullName.trim().length > 0) ? fullName.trim() : 'Candidate';
    let chosenProfile = 'Web Development cum Sales Engineer';
    if (interestedProfile && VALID_PROFILES[interestedProfile.trim()]) {
      chosenProfile = interestedProfile.trim();
    }

    const cleanDegree = (degree && degree.trim().length > 0) ? degree.trim() : 'B.Tech';
    const cleanSemester = (semester && semester.trim().length > 0) ? semester.trim() : '1st';
    const cleanYear = (year && year.trim().length > 0) ? year.trim() : '1st Year';
    const cleanBranch = (branch && branch.trim().length > 0) ? branch.trim() : 'Computer Science / Engineering';
    const cleanCollege = (collegeName && collegeName.trim().length > 0) ? collegeName.trim() : 'College / Institution';
    const cleanGradYear = (graduationYear && /^\d{4}$/.test(graduationYear.trim())) ? graduationYear.trim() : '2026';

    const normalizedEmail = (email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        error: 'Please provide a valid email address.',
        errors: { email: 'Please provide a valid email address.' }
      });
    }

    // Extract 10-digit phone number (robust against +91, 0, spaces, etc.)
    let phoneClean = phone ? String(phone).replace(/\D/g, '') : '';
    if (phoneClean.length > 10) {
      phoneClean = phoneClean.slice(-10);
    }
    if (!phoneClean || phoneClean.length < 10) {
      phoneClean = '9876543210';
    }

    const resumeFileName = file && file.filename ? file.filename : 'default_resume.pdf';

    // Select questions: 40 Common (Web Dev + Aptitude) + 10 Profile Specific
    const targetProfileCode = VALID_PROFILES[chosenProfile];
    const eligibleQuestions = await db.all(`
      SELECT id FROM questions 
      WHERE target_profile = 'COMMON' OR target_profile = ? 
      ORDER BY id ASC
    `, [targetProfileCode]);

    const questionIds = eligibleQuestions.map(q => q.id);
    const randomizedSequence = shuffleArray(questionIds);

    // Check if candidate already registered with this email
    const existingCandidate = await db.get(
      'SELECT id, full_name, interested_profile FROM candidates WHERE email = ?',
      [normalizedEmail]
    );

    if (existingCandidate) {
      // Update candidate details with latest submission info
      await db.run(`
        UPDATE candidates SET
          full_name = ?,
          interested_profile = ?,
          degree = ?,
          semester = ?,
          year = ?,
          branch = ?,
          college_name = ?,
          graduation_year = ?,
          phone = ?,
          resume_file_path = ?
        WHERE id = ?
      `, [
        cleanName,
        chosenProfile,
        cleanDegree,
        cleanSemester,
        cleanYear,
        cleanBranch,
        cleanCollege,
        cleanGradYear,
        phoneClean,
        resumeFileName,
        existingCandidate.id
      ]);

      const existingAssessment = await db.get(
        'SELECT id, status FROM assessments WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1',
        [existingCandidate.id]
      );

      if (existingAssessment) {
        // Reset assessment state cleanly so candidate can take the test fresh from question 1
        await db.run('DELETE FROM answers WHERE assessment_id = ?', [existingAssessment.id]);
        await db.run(`
          UPDATE assessments SET
            assessment_name = ?,
            status = 'NOT_STARTED',
            start_time = NULL,
            deadline = NULL,
            submission_time = NULL,
            current_question_index = 0,
            question_sequence = ?,
            total_questions = ?,
            score = 0,
            tab_switch_count = 0,
            completion_reason = NULL,
            created_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          `Round 1 – ${chosenProfile}`,
          JSON.stringify(randomizedSequence),
          randomizedSequence.length,
          existingAssessment.id
        ]);

        return res.status(200).json({
          message: 'Registration successful. Ready to begin assessment.',
          candidateId: existingCandidate.id,
          assessmentId: existingAssessment.id,
          candidateName: cleanName,
          interestedProfile: chosenProfile
        });
      } else {
        // Candidate profile existed without an assessment: create one
        const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
        const assessmentId = `ASM-${Date.now().toString(36).toUpperCase()}-${randomHex}`;

        await db.run(`
          INSERT INTO assessments (
            id, candidate_id, assessment_name, status, question_sequence, total_questions
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          assessmentId,
          existingCandidate.id,
          `Round 1 – ${chosenProfile}`,
          'NOT_STARTED',
          JSON.stringify(randomizedSequence),
          randomizedSequence.length
        ]);

        return res.status(201).json({
          message: 'Registration successful',
          candidateId: existingCandidate.id,
          assessmentId,
          candidateName: cleanName,
          interestedProfile: chosenProfile
        });
      }
    }

    // New candidate: generate clean unique IDs
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidateId = `CAN-${Date.now().toString(36).toUpperCase()}-${randomHex}`;
    const assessmentId = `ASM-${Date.now().toString(36).toUpperCase()}-${randomHex}`;

    // Insert Candidate
    await db.run(`
      INSERT INTO candidates (
        id, full_name, interested_profile, degree, semester, year, branch, college_name,
        graduation_year, email, phone, resume_file_path, consent_given
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      candidateId,
      cleanName,
      chosenProfile,
      cleanDegree,
      cleanSemester,
      cleanYear,
      cleanBranch,
      cleanCollege,
      cleanGradYear,
      normalizedEmail,
      phoneClean,
      resumeFileName,
      1
    ]);

    // Insert Assessment Record with profile name and randomized sequence
    await db.run(`
      INSERT INTO assessments (
        id, candidate_id, assessment_name, status, question_sequence, total_questions
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      assessmentId,
      candidateId,
      `Round 1 – ${chosenProfile}`,
      'NOT_STARTED',
      JSON.stringify(randomizedSequence),
      randomizedSequence.length
    ]);

    return res.status(201).json({
      message: 'Registration successful',
      candidateId,
      assessmentId,
      candidateName: fullName.trim(),
      interestedProfile: chosenProfile
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
}
