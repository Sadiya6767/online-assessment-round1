import db from '../database.js';
import crypto from 'crypto';

export async function startAssessment(req, res) {
  try {
    const { assessmentId } = req.params;

    const assessment = await db.get(`
      SELECT a.*, c.full_name 
      FROM assessments a
      JOIN candidates c ON a.candidate_id = c.id
      WHERE a.id = ?
    `, [assessmentId]);

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    if (assessment.status === 'COMPLETED' || assessment.status === 'TIMED_OUT') {
      return res.json({
        message: 'Assessment already finished.',
        status: assessment.status,
        completed: true
      });
    }

    if (assessment.status === 'NOT_STARTED') {
      const now = new Date();
      const startTime = now.toISOString();
      // Generous overall ceiling: 45 minutes to allow per-question timers across all 50 questions
      const deadline = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

      await db.run(`
        UPDATE assessments 
        SET status = 'IN_PROGRESS', start_time = ?, deadline = ?
        WHERE id = ?
      `, [startTime, deadline, assessmentId]);

      return res.json({
        message: 'Assessment started successfully.',
        status: 'IN_PROGRESS',
        startTime,
        deadline,
        totalQuestions: assessment.total_questions
      });
    }

    // Already in progress - return current deadline
    return res.json({
      message: 'Assessment in progress.',
      status: assessment.status,
      startTime: assessment.start_time,
      deadline: assessment.deadline,
      totalQuestions: assessment.total_questions
    });
  } catch (error) {
    console.error('Error starting assessment:', error);
    return res.status(500).json({ error: 'Failed to start assessment.' });
  }
}

export async function getCurrentQuestion(req, res) {
  try {
    const { assessmentId } = req.params;

    const assessment = await db.get(`
      SELECT a.*, c.full_name, c.email, c.college_name, c.interested_profile
      FROM assessments a
      JOIN candidates c ON a.candidate_id = c.id
      WHERE a.id = ?
    `, [assessmentId]);

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    // If assessment already completed or timed out
    if (assessment.status === 'COMPLETED' || assessment.status === 'TIMED_OUT') {
      return res.json({
        completed: true,
        status: assessment.status,
        submissionTime: assessment.submission_time
      });
    }

    // If not started yet, auto-start
    if (assessment.status === 'NOT_STARTED') {
      const now = new Date();
      const startTime = now.toISOString();
      const deadline = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

      await db.run(`
        UPDATE assessments 
        SET status = 'IN_PROGRESS', start_time = ?, deadline = ?
        WHERE id = ?
      `, [startTime, deadline, assessmentId]);

      assessment.status = 'IN_PROGRESS';
      assessment.start_time = startTime;
      assessment.deadline = deadline;
    }

    // Check server deadline authority
    const nowMs = Date.now();
    const deadlineMs = new Date(assessment.deadline).getTime();

    if (nowMs >= deadlineMs) {
      // Time limit expired! Auto-submit
      const scoreRow = await db.get(`
        SELECT COUNT(*) as "correctCount" 
        FROM answers 
        WHERE assessment_id = ? AND is_correct = 1
      `, [assessmentId]);

      const finalScore = scoreRow ? parseInt(scoreRow.correctCount, 10) : 0;
      const submissionTime = new Date().toISOString();

      await db.run(`
        UPDATE assessments 
        SET status = 'TIMED_OUT', 
            completion_reason = 'Time Limit Expired', 
            submission_time = ?,
            score = ?
        WHERE id = ?
      `, [submissionTime, finalScore, assessmentId]);

      return res.json({
        completed: true,
        status: 'TIMED_OUT',
        submissionTime: submissionTime
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
    const questionSequence = typeof assessment.question_sequence === 'string'
      ? JSON.parse(assessment.question_sequence)
      : assessment.question_sequence;
    const currentIndex = assessment.current_question_index;

    // Check if candidate reached the end
    if (currentIndex >= questionSequence.length) {
      const scoreRow = await db.get(`
        SELECT COUNT(*) as "correctCount" 
        FROM answers 
        WHERE assessment_id = ? AND is_correct = 1
      `, [assessmentId]);

      const finalScore = scoreRow ? parseInt(scoreRow.correctCount, 10) : 0;
      const submissionTime = new Date().toISOString();

      await db.run(`
        UPDATE assessments 
        SET status = 'COMPLETED', 
            completion_reason = 'All Questions Answered', 
            submission_time = ?,
            score = ?
        WHERE id = ?
      `, [submissionTime, finalScore, assessmentId]);

      return res.json({
        completed: true,
        status: 'COMPLETED',
        submissionTime: submissionTime
      });
    }

    const currentQuestionId = questionSequence[currentIndex];
    const question = await db.get(`
      SELECT id, section, topic, question_text, option_a, option_b, option_c, option_d 
      FROM questions 
      WHERE id = ?
    `, [currentQuestionId]);

    if (!question) {
      return res.status(500).json({ error: 'Question data missing in bank.' });
    }

    return res.json({
      completed: false,
      status: assessment.status,
      currentQuestionNumber: currentIndex + 1,
      totalQuestions: assessment.total_questions,
      remainingSeconds: remainingSeconds,
      candidateName: assessment.full_name,
      interestedProfile: assessment.interested_profile,
      question: {
        id: question.id,
        section: question.section,
        topic: question.topic,
        questionText: question.question_text,
        options: [
          { label: 'A', text: question.option_a },
          { label: 'B', text: question.option_b },
          { label: 'C', text: question.option_c },
          { label: 'D', text: question.option_d }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching current question:', error);
    return res.status(500).json({ error: 'Failed to fetch question.' });
  }
}

export async function submitAnswer(req, res) {
  const client = await db.getClient();
  try {
    const { assessmentId } = req.params;
    const { questionId, selectedOption } = req.body;
    const normalizedOption = (selectedOption || '').trim().toUpperCase();

    if (!['A', 'B', 'C', 'D', 'TIMEOUT', 'SKIPPED'].includes(normalizedOption)) {
      client.release();
      return res.status(400).json({ error: 'Invalid answer option.' });
    }

    const assessment = await db.get(`
      SELECT * FROM assessments WHERE id = ?
    `, [assessmentId]);

    if (!assessment) {
      client.release();
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    if (assessment.status === 'COMPLETED' || assessment.status === 'TIMED_OUT') {
      client.release();
      return res.status(400).json({
        error: 'Assessment is already completed.',
        completed: true,
        status: assessment.status
      });
    }

    // Server-side Deadline Enforcement
    const nowMs = Date.now();
    const deadlineMs = new Date(assessment.deadline).getTime();

    if (nowMs >= deadlineMs) {
      const scoreRow = await db.get(`
        SELECT COUNT(*) as "correctCount" 
        FROM answers 
        WHERE assessment_id = ? AND is_correct = 1
      `, [assessmentId]);

      const finalScore = scoreRow ? parseInt(scoreRow.correctCount, 10) : 0;
      const submissionTime = new Date().toISOString();

      await db.run(`
        UPDATE assessments 
        SET status = 'TIMED_OUT', 
            completion_reason = 'Time Limit Expired', 
            submission_time = ?,
            score = ?
        WHERE id = ?
      `, [submissionTime, finalScore, assessmentId]);

      client.release();
      return res.json({
        completed: true,
        status: 'TIMED_OUT',
        message: 'Time limit has expired. Assessment submitted automatically.'
      });
    }

    const questionSequence = typeof assessment.question_sequence === 'string'
      ? JSON.parse(assessment.question_sequence)
      : assessment.question_sequence;
    const currentIndex = assessment.current_question_index;
    const expectedQuestionId = questionSequence[currentIndex];

    // Anti-tampering check: ensure candidate is answering the expected question
    if (parseInt(questionId, 10) !== expectedQuestionId) {
      client.release();
      return res.status(400).json({
        error: 'Out-of-order submission. You can only answer the current question.'
      });
    }

    // Check if question already answered
    const existingAnswer = await db.get(`
      SELECT id FROM answers WHERE assessment_id = ? AND question_id = ?
    `, [assessmentId, questionId]);

    if (existingAnswer) {
      client.release();
      return res.status(400).json({
        error: 'An answer has already been submitted for this question. Modification is not allowed.'
      });
    }

    // Evaluate answer against database (never exposed to client)
    const question = await db.get('SELECT correct_option FROM questions WHERE id = ?', [questionId]);
    if (!question) {
      client.release();
      return res.status(404).json({ error: 'Question not found.' });
    }

    const isCorrect = (['A', 'B', 'C', 'D'].includes(normalizedOption) && question.correct_option.trim().toUpperCase() === normalizedOption) ? 1 : 0;
    const answerId = `ANS-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;

    // Transaction to insert answer, advance pointer, and update assessment state
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO answers (id, assessment_id, question_id, selected_option, is_correct)
      VALUES ($1, $2, $3, $4, $5)
    `, [answerId, assessmentId, questionId, normalizedOption, isCorrect]);

    const nextIndex = currentIndex + 1;
    const isFinished = nextIndex >= questionSequence.length;

    // Recalculate score
    const scoreRes = await client.query(`
      SELECT COUNT(*) as count FROM answers WHERE assessment_id = $1 AND is_correct = 1
    `, [assessmentId]);
    const currentScore = parseInt(scoreRes.rows[0].count, 10);

    if (isFinished) {
      const submissionTime = new Date().toISOString();
      await client.query(`
        UPDATE assessments 
        SET current_question_index = $1, 
            score = $2, 
            status = 'COMPLETED', 
            completion_reason = 'All Questions Answered', 
            submission_time = $3
        WHERE id = $4
      `, [nextIndex, currentScore, submissionTime, assessmentId]);
    } else {
      await client.query(`
        UPDATE assessments 
        SET current_question_index = $1, 
            score = $2
        WHERE id = $3
      `, [nextIndex, currentScore, assessmentId]);
    }

    await client.query('COMMIT');
    client.release();

    return res.json({
      success: true,
      completed: isFinished,
      nextQuestionNumber: nextIndex + 1
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      // rollback error ignored
    }
    client.release();
    console.error('Error submitting answer:', error);
    return res.status(500).json({ error: 'Failed to record answer.' });
  }
}

export async function getAssessmentStatus(req, res) {
  try {
    const { assessmentId } = req.params;

    const assessment = await db.get(`
      SELECT a.id as "assessmentId", a.status, a.submission_time as "submissionTime", 
             a.completion_reason as "completionReason", a.total_questions as "totalQuestions",
             c.id as "candidateId", c.full_name as "candidateName", c.email, c.college_name as "collegeName"
      FROM assessments a
      JOIN candidates c ON a.candidate_id = c.id
      WHERE a.id = ?
    `, [assessmentId]);

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment record not found.' });
    }

    // STRICTLY OMIT score, marks, percentage, and answers from candidate payload!
    return res.json({
      assessmentId: assessment.assessmentId,
      candidateId: assessment.candidateId,
      candidateName: assessment.candidateName,
      email: assessment.email,
      collegeName: assessment.collegeName,
      status: assessment.status,
      submissionTime: assessment.submissionTime,
      completionReason: assessment.completionReason,
      totalQuestions: assessment.totalQuestions,
      companyName: 'Nexis Technologies'
    });
  } catch (error) {
    console.error('Error fetching assessment status:', error);
    return res.status(500).json({ error: 'Failed to retrieve assessment status.' });
  }
}
