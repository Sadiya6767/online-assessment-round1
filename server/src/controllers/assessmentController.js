import db from '../database.js';
import crypto from 'crypto';

export function startAssessment(req, res) {
  try {
    const { assessmentId } = req.params;

    const assessment = db.prepare(`
      SELECT a.*, c.full_name 
      FROM assessments a
      JOIN candidates c ON a.candidate_id = c.id
      WHERE a.id = ?
    `).get(assessmentId);

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
      // Total duration is 25 minutes = 25 * 60 * 1000 ms
      const deadline = new Date(now.getTime() + 25 * 60 * 1000).toISOString();

      db.prepare(`
        UPDATE assessments 
        SET status = 'IN_PROGRESS', start_time = ?, deadline = ?
        WHERE id = ?
      `).run(startTime, deadline, assessmentId);

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

export function getCurrentQuestion(req, res) {
  try {
    const { assessmentId } = req.params;

    const assessment = db.prepare(`
      SELECT a.*, c.full_name, c.email, c.college_name
      FROM assessments a
      JOIN candidates c ON a.candidate_id = c.id
      WHERE a.id = ?
    `).get(assessmentId);

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
      const deadline = new Date(now.getTime() + 25 * 60 * 1000).toISOString();

      db.prepare(`
        UPDATE assessments 
        SET status = 'IN_PROGRESS', start_time = ?, deadline = ?
        WHERE id = ?
      `).run(startTime, deadline, assessmentId);

      assessment.status = 'IN_PROGRESS';
      assessment.start_time = startTime;
      assessment.deadline = deadline;
    }

    // Check server deadline authority
    const nowMs = Date.now();
    const deadlineMs = new Date(assessment.deadline).getTime();

    if (nowMs >= deadlineMs) {
      // 25-minute limit expired! Auto-submit
      const scoreRow = db.prepare(`
        SELECT COUNT(*) as correctCount 
        FROM answers 
        WHERE assessment_id = ? AND is_correct = 1
      `).get(assessmentId);

      const finalScore = scoreRow ? scoreRow.correctCount : 0;
      const submissionTime = new Date().toISOString();

      db.prepare(`
        UPDATE assessments 
        SET status = 'TIMED_OUT', 
            completion_reason = '25-Minute Time Limit Expired', 
            submission_time = ?,
            score = ?
        WHERE id = ?
      `).run(submissionTime, finalScore, assessmentId);

      return res.json({
        completed: true,
        status: 'TIMED_OUT',
        submissionTime: submissionTime
      });
    }

    const remainingSeconds = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
    const questionSequence = JSON.parse(assessment.question_sequence);
    const currentIndex = assessment.current_question_index;

    // Check if candidate reached the end
    if (currentIndex >= questionSequence.length) {
      const scoreRow = db.prepare(`
        SELECT COUNT(*) as correctCount 
        FROM answers 
        WHERE assessment_id = ? AND is_correct = 1
      `).get(assessmentId);

      const finalScore = scoreRow ? scoreRow.correctCount : 0;
      const submissionTime = new Date().toISOString();

      db.prepare(`
        UPDATE assessments 
        SET status = 'COMPLETED', 
            completion_reason = 'All Questions Answered', 
            submission_time = ?,
            score = ?
        WHERE id = ?
      `).run(submissionTime, finalScore, assessmentId);

      return res.json({
        completed: true,
        status: 'COMPLETED',
        submissionTime: submissionTime
      });
    }

    const currentQuestionId = questionSequence[currentIndex];
    const question = db.prepare(`
      SELECT id, section, topic, question_text, option_a, option_b, option_c, option_d 
      FROM questions 
      WHERE id = ?
    `).get(currentQuestionId);

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

export function submitAnswer(req, res) {
  try {
    const { assessmentId } = req.params;
    const { questionId, selectedOption } = req.body;

    if (!selectedOption || !['A', 'B', 'C', 'D'].includes(selectedOption.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid answer option. Must be A, B, C, or D.' });
    }

    const assessment = db.prepare(`
      SELECT * FROM assessments WHERE id = ?
    `).get(assessmentId);

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    if (assessment.status === 'COMPLETED' || assessment.status === 'TIMED_OUT') {
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
      const scoreRow = db.prepare(`
        SELECT COUNT(*) as correctCount 
        FROM answers 
        WHERE assessment_id = ? AND is_correct = 1
      `).get(assessmentId);

      const finalScore = scoreRow ? scoreRow.correctCount : 0;
      const submissionTime = new Date().toISOString();

      db.prepare(`
        UPDATE assessments 
        SET status = 'TIMED_OUT', 
            completion_reason = '25-Minute Time Limit Expired', 
            submission_time = ?,
            score = ?
        WHERE id = ?
      `).run(submissionTime, finalScore, assessmentId);

      return res.json({
        completed: true,
        status: 'TIMED_OUT',
        message: 'Time limit has expired. Assessment submitted automatically.'
      });
    }

    const questionSequence = JSON.parse(assessment.question_sequence);
    const currentIndex = assessment.current_question_index;
    const expectedQuestionId = questionSequence[currentIndex];

    // Anti-tampering check: ensure candidate is answering the expected question
    if (parseInt(questionId, 10) !== expectedQuestionId) {
      return res.status(400).json({
        error: 'Out-of-order submission. You can only answer the current question.'
      });
    }

    // Check if question already answered
    const existingAnswer = db.prepare(`
      SELECT id FROM answers WHERE assessment_id = ? AND question_id = ?
    `).get(assessmentId, questionId);

    if (existingAnswer) {
      return res.status(400).json({
        error: 'An answer has already been submitted for this question. Modification is not allowed.'
      });
    }

    // Evaluate answer against database (never exposed to client)
    const question = db.prepare('SELECT correct_option FROM questions WHERE id = ?').get(questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    const isCorrect = (question.correct_option.trim().toUpperCase() === selectedOption.trim().toUpperCase()) ? 1 : 0;
    const answerId = `ANS-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;

    // Transaction to insert answer, advance pointer, and update assessment state
    const submitTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO answers (id, assessment_id, question_id, selected_option, is_correct)
        VALUES (?, ?, ?, ?, ?)
      `).run(answerId, assessmentId, questionId, selectedOption.toUpperCase(), isCorrect);

      const nextIndex = currentIndex + 1;
      const isFinished = nextIndex >= questionSequence.length;

      // Recalculate score
      const currentScore = db.prepare(`
        SELECT COUNT(*) as count FROM answers WHERE assessment_id = ? AND is_correct = 1
      `).get(assessmentId).count;

      if (isFinished) {
        const submissionTime = new Date().toISOString();
        db.prepare(`
          UPDATE assessments 
          SET current_question_index = ?, 
              score = ?, 
              status = 'COMPLETED', 
              completion_reason = 'All Questions Answered', 
              submission_time = ?
          WHERE id = ?
        `).run(nextIndex, currentScore, submissionTime, assessmentId);
      } else {
        db.prepare(`
          UPDATE assessments 
          SET current_question_index = ?, 
              score = ?
          WHERE id = ?
        `).run(nextIndex, currentScore, assessmentId);
      }

      return { nextIndex, isFinished };
    });

    const result = submitTransaction();

    return res.json({
      success: true,
      completed: result.isFinished,
      nextQuestionNumber: result.nextIndex + 1
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return res.status(500).json({ error: 'Failed to record answer.' });
  }
}

export function getAssessmentStatus(req, res) {
  try {
    const { assessmentId } = req.params;

    const assessment = db.prepare(`
      SELECT a.id as assessmentId, a.status, a.submission_time as submissionTime, 
             a.completion_reason as completionReason, a.total_questions as totalQuestions,
             c.id as candidateId, c.full_name as candidateName, c.email, c.college_name as collegeName
      FROM assessments a
      JOIN candidates c ON a.candidate_id = c.id
      WHERE a.id = ?
    `).get(assessmentId);

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
