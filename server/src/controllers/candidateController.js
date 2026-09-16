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

    // Validation checks
    const errors = {};

    if (!fullName || fullName.trim().length < 2) {
      errors.fullName = 'Please enter your complete legal name.';
    }

    let chosenProfile = 'Web Development cum Sales Engineer';
    if (interestedProfile && VALID_PROFILES[interestedProfile.trim()]) {
      chosenProfile = interestedProfile.trim();
    } else if (interestedProfile && !VALID_PROFILES[interestedProfile.trim()]) {
      errors.interestedProfile = 'Please select a valid career profile from the available options.';
    }

    if (!degree || degree.trim().length === 0) {
      errors.degree = 'Please select or enter your degree.';
    }

    if (!semester || semester.trim().length === 0) {
      errors.semester = 'Please select your current semester.';
    }

    if (!year || year.trim().length === 0) {
      errors.year = 'Please select your current academic year.';
    }

    if (!branch || branch.trim().length === 0) {
      errors.branch = 'Please specify your branch/specialization.';
    }

    if (!collegeName || collegeName.trim().length < 3) {
      errors.collegeName = 'Please enter your full college/institution name.';
    }

    if (!graduationYear || !/^\d{4}$/.test(graduationYear.trim())) {
      errors.graduationYear = 'Please provide a valid 4-digit graduation year.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim().toLowerCase())) {
      errors.email = 'Please provide a valid email address.';
    }

    // 10-digit Indian mobile number validation (starts with 6, 7, 8, or 9)
    const phoneClean = phone ? phone.trim().replace(/\D/g, '') : '';
    const indianPhoneRegex = /^[6-9]\d{9}$/;
    if (!phoneClean || !indianPhoneRegex.test(phoneClean)) {
      errors.phone = 'Please provide a valid 10-digit Indian mobile number (e.g. 9876543210).';
    }

    if (!consent || consent === 'false' || consent === false) {
      errors.consent = 'You must confirm the consent checkbox before proceeding.';
    }

    if (!file) {
      errors.resume = 'Resume file is required. Please upload a PDF, DOC, or DOCX document.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if candidate already registered with completed or in-progress test
    const existingCandidate = await db.get('SELECT id, interested_profile FROM candidates WHERE email = ?', [normalizedEmail]);
    if (existingCandidate) {
      const existingAssessment = await db.get('SELECT id, status FROM assessments WHERE candidate_id = ?', [existingCandidate.id]);
      if (existingAssessment) {
        if (existingAssessment.status === 'COMPLETED' || existingAssessment.status === 'TIMED_OUT') {
          return res.status(400).json({
            error: 'This email address has already completed or submitted the Round 1 assessment. Multiple attempts are not permitted.'
          });
        } else if (existingAssessment.status === 'IN_PROGRESS') {
          // Allow candidate to resume their ongoing session
          return res.json({
            message: 'Resuming active assessment session.',
            candidateId: existingCandidate.id,
            assessmentId: existingAssessment.id,
            interestedProfile: existingCandidate.interested_profile,
            isResuming: true
          });
        }
      }
    }

    // Generate clean unique IDs
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidateId = `CAN-${Date.now().toString(36).toUpperCase()}-${randomHex}`;
    const assessmentId = `ASM-${Date.now().toString(36).toUpperCase()}-${randomHex}`;

    // Select questions: 40 Common (Web Dev + Aptitude) + 10 Profile Specific
    const targetProfileCode = VALID_PROFILES[chosenProfile];
    const eligibleQuestions = await db.all(`
      SELECT id FROM questions 
      WHERE target_profile = 'COMMON' OR target_profile = ? 
      ORDER BY id ASC
    `, [targetProfileCode]);

    const questionIds = eligibleQuestions.map(q => q.id);
    const randomizedSequence = shuffleArray(questionIds);

    // Insert Candidate
    await db.run(`
      INSERT INTO candidates (
        id, full_name, interested_profile, degree, semester, year, branch, college_name,
        graduation_year, email, phone, resume_file_path, consent_given
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      candidateId,
      fullName.trim(),
      chosenProfile,
      degree.trim(),
      semester.trim(),
      year.trim(),
      branch.trim(),
      collegeName.trim(),
      graduationYear.trim(),
      normalizedEmail,
      phoneClean,
      file.filename,
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
