/**
 * Student Controller - Exam taking, results viewing
 */
const { query, withTransaction } = require('../config/database');
const { paginate, paginationMeta, calculateGrade, getClientIp } = require('../utils/helpers');
const { logAction } = require('../utils/logger');
const {
  calculateIntegrityFingerprint,
  extractConcepts,
  buildLearningPath,
  safeNumber
} = require('../utils/advancedFeatures');

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const sid = req.user.id;
    const [courses, upcoming, results, recentResults] = await Promise.all([
      query(`SELECT COUNT(*) FROM enrollments WHERE student_id=$1 AND status='active'`, [sid]),
      query(`SELECT COUNT(*) FROM exams e
             JOIN courses c ON c.id = e.course_id
             JOIN enrollments en ON en.course_id = c.id
             WHERE en.student_id=$1 AND e.status IN ('published','active')
             AND e.end_time > NOW() AND NOT EXISTS (SELECT 1 FROM submissions WHERE exam_id=e.id AND student_id=$1)`, [sid]),
      query(`SELECT COUNT(*) FROM results WHERE student_id=$1 AND is_published=true`, [sid]),
      query(`SELECT r.*, e.title AS exam_title, c.title AS course_title
             FROM results r JOIN exams e ON e.id = r.exam_id JOIN courses c ON c.id = e.course_id
             WHERE r.student_id=$1 AND r.is_published=true ORDER BY r.created_at DESC LIMIT 5`, [sid])
    ]);
    res.json({ success: true, stats: {
      enrolled_courses: parseInt(courses.rows[0].count),
      upcoming_exams: parseInt(upcoming.rows[0].count),
      results: parseInt(results.rows[0].count)
    }, recent_results: recentResults.rows });
  } catch (err) { next(err); }
};

// ─── COURSES ─────────────────────────────────────────────────────────────────
const getCourses = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.*, d.name AS department_name, u.name AS teacher_name,
              en.enrolled_at, en.status AS enrollment_status,
              (SELECT COUNT(*) FROM exams WHERE course_id = c.id AND status IN ('published','active','completed','results_published')) AS exam_count
       FROM enrollments en
       JOIN courses c ON c.id = en.course_id
       LEFT JOIN departments d ON d.id = c.department_id
       LEFT JOIN users u ON u.id = c.teacher_id
       WHERE en.student_id=$1 AND en.status='active'
       ORDER BY c.title`, [req.user.id]
    );
    res.json({ success: true, courses: result.rows });
  } catch (err) { next(err); }
};

// ─── EXAMS ───────────────────────────────────────────────────────────────────
const getExams = async (req, res, next) => {
  try {
    const { filter = 'upcoming', course_id } = req.query;
    const sid = req.user.id;
    let statusCondition = '';
    if (filter === 'upcoming') statusCondition = `AND e.end_time > NOW() AND e.status IN ('published','active')`;
    else if (filter === 'past') statusCondition = `AND (e.end_time <= NOW() OR e.status IN ('completed','results_published'))`;
    const courseFilter = course_id ? `AND c.id = ${parseInt(course_id)}` : '';
    const result = await query(
      `SELECT e.*, c.title AS course_title, u.name AS teacher_name,
              sub.id AS submission_id, sub.status AS submission_status, sub.submitted_at,
              r.marks_obtained, r.percentage, r.grade, r.is_published AS result_published,
              (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) AS question_count
       FROM exams e
       JOIN courses c ON c.id = e.course_id
       JOIN enrollments en ON en.course_id = c.id AND en.student_id = $1
       LEFT JOIN users u ON u.id = e.teacher_id
       LEFT JOIN submissions sub ON sub.exam_id = e.id AND sub.student_id = $1
       LEFT JOIN results r ON r.submission_id = sub.id
       WHERE en.status = 'active' ${statusCondition} ${courseFilter}
       ORDER BY e.start_time ASC`, [sid]
    );
    res.json({ success: true, exams: result.rows });
  } catch (err) { next(err); }
};

const getExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sid = req.user.id;
    // Check enrollment
    const examResult = await query(
      `SELECT e.*, c.title AS course_title, u.name AS teacher_name
       FROM exams e
       JOIN courses c ON c.id = e.course_id
       JOIN enrollments en ON en.course_id = c.id AND en.student_id = $1
       LEFT JOIN users u ON u.id = e.teacher_id
       WHERE e.id = $2 AND e.status IN ('published','active','completed','results_published')`,
      [sid, id]
    );
    if (examResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found or not accessible' });
    const exam = examResult.rows[0];
    // Check if already submitted
    const sub = await query(`SELECT id, status FROM submissions WHERE exam_id=$1 AND student_id=$2`, [id, sid]);
    res.json({ success: true, exam, already_submitted: sub.rows.length > 0, submission: sub.rows[0] || null });
  } catch (err) { next(err); }
};

// ─── START EXAM ───────────────────────────────────────────────────────────────
const startExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sid = req.user.id;
    const now = new Date();

    // Validate exam
    const examResult = await query(
      `SELECT e.* FROM exams e
       JOIN courses c ON c.id = e.course_id
       JOIN enrollments en ON en.course_id = c.id AND en.student_id = $1
       WHERE e.id = $2 AND e.status IN ('published','active')`,
      [sid, id]
    );
    if (examResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found or not available' });
    const exam = examResult.rows[0];

    if (new Date(exam.start_time) > now) return res.status(400).json({ success: false, message: 'Exam has not started yet' });
    if (new Date(exam.end_time) < now) return res.status(400).json({ success: false, message: 'Exam has ended' });

    // Check/create submission (allow resume)
    let sub = await query(`SELECT * FROM submissions WHERE exam_id=$1 AND student_id=$2`, [id, sid]);
    if (sub.rows.length > 0 && sub.rows[0].status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Exam already submitted' });
    }

    if (sub.rows.length === 0) {
      sub = await query(
        `INSERT INTO submissions (exam_id, student_id, ip_address) VALUES ($1,$2,$3) RETURNING *`,
        [id, sid, getClientIp(req)]
      );
    }

    // Mark exam as active
    await query(`UPDATE exams SET status='active' WHERE id=$1 AND status='published'`, [id]);

    // Get questions (without correct answers for student!)
    const questions = await query(
      `SELECT id, question_text, question_type, options, marks, order_index FROM questions
       WHERE exam_id=$1 ORDER BY order_index, id`, [id]
    );

    // Calculate time remaining
    const elapsedSeconds = Math.floor((now - new Date(sub.rows[0].started_at)) / 1000);
    const totalSeconds = exam.duration_minutes * 60;
    const timeRemaining = Math.max(0, totalSeconds - elapsedSeconds);

    // Get existing answers for resume
    const existingAnswers = await query(
      `SELECT question_id, answer_text FROM answers WHERE submission_id=$1`, [sub.rows[0].id]
    );

    await logAction({ userId: sid, action: 'START_EXAM', entityType: 'exam', entityId: parseInt(id), ipAddress: getClientIp(req) });

    res.json({
      success: true,
      exam: { ...exam, total_questions: questions.rows.length },
      questions: questions.rows,
      submission_id: sub.rows[0].id,
      time_remaining: timeRemaining,
      existing_answers: existingAnswers.rows
    });
  } catch (err) { next(err); }
};

// ─── SUBMIT EXAM ──────────────────────────────────────────────────────────────
const submitExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sid = req.user.id;
    const { answers = [], auto_submitted = false, time_taken = 0, tab_switches = 0 } = req.body;

    const subResult = await query(
      `SELECT s.* FROM submissions s WHERE s.exam_id=$1 AND s.student_id=$2 AND s.status='in_progress'`, [id, sid]
    );
    if (subResult.rows.length === 0) return res.status(400).json({ success: false, message: 'No active submission found' });
    const sub = subResult.rows[0];

    const examResult = await query(
      `SELECT * FROM exams WHERE id=$1`, [id]
    );
    const exam = examResult.rows[0];

    // Get all questions for auto-grading
    const questionsResult = await query(`SELECT * FROM questions WHERE exam_id=$1`, [id]);
    const questionsMap = {};
    questionsResult.rows.forEach(q => questionsMap[q.id] = q);

    let totalMarksObtained = 0;

    // Save answers and auto-grade objective questions
    await withTransaction(async (client) => {
      for (const ans of answers) {
        const q = questionsMap[ans.question_id];
        if (!q) continue;
        let isCorrect = null;
        let marksAwarded = 0;

        if (q.question_type === 'mcq' || q.question_type === 'true_false') {
          isCorrect = q.correct_answer && ans.answer?.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
          if (isCorrect) {
            marksAwarded = q.marks;
          } else if (ans.answer && exam.negative_marking > 0) {
            marksAwarded = -parseFloat(exam.negative_marking);
          }
          totalMarksObtained += marksAwarded;
        }
        // short_answer: teacher grades manually, marks_awarded stays 0

        await client.query(
          `INSERT INTO answers (submission_id, question_id, answer_text, is_correct, marks_awarded)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (submission_id, question_id) DO UPDATE SET
             answer_text=$3, is_correct=$4, marks_awarded=$5`,
          [sub.id, ans.question_id, ans.answer || '', isCorrect, marksAwarded]
        );
      }

      // Mark submission as submitted
      await client.query(
        `UPDATE submissions SET status='submitted', submitted_at=NOW(), time_taken=$1, auto_submitted=$2, tab_switches=$3 WHERE id=$4`,
        [time_taken, auto_submitted, tab_switches, sub.id]
      );
    });

    // Check if all questions are objective (auto-grade complete)
    const hasShortAnswer = questionsResult.rows.some(q => q.question_type === 'short_answer');
    const percentage = (totalMarksObtained / exam.total_marks) * 100;
    const isPassed = totalMarksObtained >= exam.pass_marks;
    const grade = calculateGrade(percentage);

    // Create/update result
    await query(
      `INSERT INTO results (submission_id, student_id, exam_id, total_marks, marks_obtained, percentage, grade, is_passed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (submission_id) DO UPDATE SET
         marks_obtained=$5, percentage=$6, grade=$7, is_passed=$8, updated_at=NOW()`,
      [sub.id, sid, id, exam.total_marks, totalMarksObtained, Math.max(0, percentage).toFixed(2), grade, isPassed]
    );

    const answeredCount = answers.filter((a) => (a.answer || '').toString().trim()).length;
    const integrity = calculateIntegrityFingerprint({
      tabSwitches: safeNumber(tab_switches),
      timeTaken: safeNumber(time_taken),
      durationMinutes: safeNumber(exam.duration_minutes, 60),
      answered: answeredCount,
      totalQuestions: questionsResult.rows.length
    });

    let adaptiveVivaRecommended = false;
    const baseline = await query(
      `SELECT AVG(r.percentage) AS avg_percentage, COALESCE(STDDEV_POP(r.percentage), 0) AS std_percentage
       FROM results r
       JOIN exams ex ON ex.id = r.exam_id
       WHERE r.student_id=$1 AND ex.course_id=$2 AND r.exam_id <> $3`,
      [sid, exam.course_id, id]
    );
    const avg = safeNumber(baseline.rows[0]?.avg_percentage, 0);
    const std = safeNumber(baseline.rows[0]?.std_percentage, 0);
    const currentPct = safeNumber(Math.max(0, percentage), 0);
    const threshold = avg + Math.max(15, std * 1.5);

    if (avg > 0 && currentPct > threshold && integrity.riskLevel !== 'low') {
      adaptiveVivaRecommended = true;
      await logAction({
        userId: sid,
        action: 'ADAPTIVE_VIVA_TRIGGERED',
        entityType: 'submission',
        entityId: sub.id,
        details: { avg_percentage: avg, std_percentage: std, current_percentage: currentPct, integrity },
        ipAddress: getClientIp(req)
      });
    }

    await logAction({
      userId: sid,
      action: auto_submitted ? 'AUTO_SUBMIT_EXAM' : 'SUBMIT_EXAM',
      entityType: 'exam',
      entityId: parseInt(id),
      details: { auto_submitted, time_taken, tab_switches, integrity, adaptiveVivaRecommended },
      ipAddress: getClientIp(req)
    });

    res.json({
      success: true,
      message: 'Exam submitted successfully',
      submission_id: sub.id,
      auto_graded: !hasShortAnswer,
      pending_manual_grading: hasShortAnswer,
      integrity_fingerprint: integrity,
      adaptive_viva_recommended: adaptiveVivaRecommended
    });
  } catch (err) { next(err); }
};

// ─── RECOVERY-BY-DESIGN AUTO SAVE ───────────────────────────────────────────
const autosaveExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sid = req.user.id;
    const { answers = [], time_taken = 0, tab_switches = 0 } = req.body;

    const subResult = await query(
      `SELECT id FROM submissions WHERE exam_id=$1 AND student_id=$2 AND status='in_progress'`,
      [id, sid]
    );

    if (subResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No active submission to autosave' });
    }

    const subId = subResult.rows[0].id;

    await withTransaction(async (client) => {
      for (const ans of answers) {
        if (!ans.question_id) continue;
        await client.query(
          `INSERT INTO answers (submission_id, question_id, answer_text, marks_awarded)
           VALUES ($1,$2,$3,0)
           ON CONFLICT (submission_id, question_id) DO UPDATE SET answer_text=$3`,
          [subId, ans.question_id, (ans.answer || '').toString()]
        );
      }

      await client.query(
        `UPDATE submissions SET time_taken=$1, tab_switches=$2 WHERE id=$3`,
        [time_taken, tab_switches, subId]
      );
    });

    res.json({ success: true, message: 'Autosaved', submission_id: subId, saved_answers: answers.length });
  } catch (err) { next(err); }
};

// ─── RESULTS ─────────────────────────────────────────────────────────────────
const getResults = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { offset, limit: lim, page: pg } = paginate(page, limit);
    const result = await query(
      `SELECT r.*, e.title AS exam_title, e.exam_type, e.total_marks,
              c.title AS course_title, c.code AS course_code,
              s.submitted_at, s.time_taken, s.auto_submitted
       FROM results r
       JOIN exams e ON e.id = r.exam_id
       JOIN courses c ON c.id = e.course_id
       JOIN submissions s ON s.id = r.submission_id
       WHERE r.student_id=$1 AND r.is_published=true
       ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, lim, offset]
    );
    const total = await query(`SELECT COUNT(*) FROM results WHERE student_id=$1 AND is_published=true`, [req.user.id]);
    res.json({ success: true, results: result.rows, pagination: paginationMeta(total.rows[0].count, pg, lim) });
  } catch (err) { next(err); }
};

const getResult = async (req, res, next) => {
  try {
    const { id } = req.params; // submission_id
    const resultData = await query(
      `SELECT r.*, e.title AS exam_title, e.exam_type, e.total_marks, e.pass_marks,
              e.negative_marking, e.instructions,
              c.title AS course_title, c.code AS course_code,
              u.name AS teacher_name, s.submitted_at, s.time_taken, s.tab_switches
       FROM results r
       JOIN submissions s ON s.id = r.submission_id
       JOIN exams e ON e.id = r.exam_id
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN users u ON u.id = e.teacher_id
       WHERE r.submission_id=$1 AND r.student_id=$2 AND r.is_published=true`,
      [id, req.user.id]
    );
    if (resultData.rows.length === 0) return res.status(404).json({ success: false, message: 'Result not found' });

    // Get answers with questions
    const answersData = await query(
      `SELECT a.*, q.question_text, q.question_type, q.options, q.correct_answer, q.explanation, q.marks, q.order_index
       FROM answers a JOIN questions q ON q.id = a.question_id
       WHERE a.submission_id=$1 ORDER BY q.order_index, q.id`, [id]
    );

    const weakConceptSet = new Set();
    for (const answer of answersData.rows) {
      const marksAwarded = safeNumber(answer.marks_awarded, 0);
      const fullMarks = safeNumber(answer.marks, 0);
      if (marksAwarded < fullMarks) {
        extractConcepts(answer.question_text, 2).forEach((c) => weakConceptSet.add(c));
      }
    }

    const weakConcepts = Array.from(weakConceptSet).slice(0, 8);
    const learningPath = buildLearningPath(weakConcepts);

    res.json({
      success: true,
      result: resultData.rows[0],
      answers: answersData.rows,
      learning_path: {
        weak_concepts: weakConcepts,
        plan: learningPath
      }
    });
  } catch (err) { next(err); }
};

// ─── SKILL TRANSCRIPT ───────────────────────────────────────────────────────
const getSkillTranscript = async (req, res, next) => {
  try {
    const sid = req.user.id;
    const result = await query(
      `SELECT c.code AS course_code, c.title AS course_title,
              ROUND(AVG(r.percentage), 2) AS avg_percentage,
              COUNT(*) AS attempts,
              MAX(r.percentage) AS best_percentage
       FROM results r
       JOIN exams e ON e.id = r.exam_id
       JOIN courses c ON c.id = e.course_id
       WHERE r.student_id=$1 AND r.is_published=true
       GROUP BY c.code, c.title
       ORDER BY avg_percentage DESC`,
      [sid]
    );

    const skills = result.rows.map((row) => {
      const avg = safeNumber(row.avg_percentage, 0);
      let level = 'Beginner';
      if (avg >= 85) level = 'Advanced';
      else if (avg >= 70) level = 'Intermediate';

      return {
        competency: row.course_title,
        course_code: row.course_code,
        level,
        avg_percentage: avg,
        attempts: safeNumber(row.attempts, 0),
        best_percentage: safeNumber(row.best_percentage, 0)
      };
    });

    res.json({ success: true, student_id: sid, skills });
  } catch (err) { next(err); }
};

// ─── TRUST AUDIT TRAIL (DISPUTE PACK) ──────────────────────────────────────
const getDisputePack = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sid = req.user.id;

    const submission = await query(
      `SELECT s.*, e.title AS exam_title, e.total_marks, e.pass_marks, e.duration_minutes,
              r.marks_obtained, r.percentage, r.grade, r.is_passed
       FROM submissions s
       JOIN exams e ON e.id = s.exam_id
       LEFT JOIN results r ON r.submission_id = s.id
       WHERE s.id=$1 AND s.student_id=$2`,
      [id, sid]
    );

    if (submission.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const answers = await query(
      `SELECT a.question_id, q.question_text, q.question_type, q.marks,
              a.answer_text, a.marks_awarded, a.teacher_feedback, a.graded_at
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.submission_id=$1
       ORDER BY q.order_index, q.id`,
      [id]
    );

    const timeline = await query(
      `SELECT action, details, ip_address, created_at
       FROM system_logs
       WHERE user_id=$1 AND (entity_id=$2 OR (details->>'submission_id')::int=$2)
       ORDER BY created_at ASC`,
      [sid, id]
    );

    res.json({
      success: true,
      dispute_pack: {
        submission: submission.rows[0],
        answers: answers.rows,
        timeline: timeline.rows,
        generated_at: new Date().toISOString()
      }
    });
  } catch (err) { next(err); }
};

module.exports = {
  getDashboard,
  getCourses,
  getExams,
  getExam,
  startExam,
  submitExam,
  autosaveExam,
  getResults,
  getResult,
  getSkillTranscript,
  getDisputePack
};
