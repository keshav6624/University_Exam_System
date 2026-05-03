/**
 * Teacher Controller - Course, Exam, Question, Grading management
 */
const { query } = require('../config/database');
const { paginate, paginationMeta, calculateGrade, getClientIp } = require('../utils/helpers');
const { logAction } = require('../utils/logger');
const {
  extractConcepts,
  calculateQuestionQuality,
  jaccardSimilarity,
  equateScore,
  safeNumber
} = require('../utils/advancedFeatures');

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const tid = req.user.id;
    const [courses, exams, submissions, pending] = await Promise.all([
      query(`SELECT COUNT(*) FROM courses WHERE teacher_id = $1 AND is_active = true`, [tid]),
      query(`SELECT COUNT(*) FROM exams WHERE teacher_id = $1`, [tid]),
      query(`SELECT COUNT(*) FROM submissions s JOIN exams e ON e.id = s.exam_id WHERE e.teacher_id = $1 AND s.status = 'submitted'`, [tid]),
      query(`SELECT COUNT(*) FROM answers a
             JOIN submissions s ON s.id = a.submission_id
             JOIN questions q ON q.id = a.question_id
             JOIN exams e ON e.id = s.exam_id
             WHERE e.teacher_id = $1 AND q.question_type = 'short_answer' AND a.is_correct IS NULL AND s.status = 'submitted'`, [tid])
    ]);
    const recentExams = await query(
      `SELECT e.*, c.title AS course_title,
        (SELECT COUNT(*) FROM submissions WHERE exam_id = e.id) AS submission_count
       FROM exams e LEFT JOIN courses c ON c.id = e.course_id
       WHERE e.teacher_id = $1 ORDER BY e.created_at DESC LIMIT 5`, [tid]
    );
    res.json({ success: true, stats: {
      courses: parseInt(courses.rows[0].count),
      exams: parseInt(exams.rows[0].count),
      pending_submissions: parseInt(submissions.rows[0].count),
      pending_grading: parseInt(pending.rows[0].count)
    }, recent_exams: recentExams.rows });
  } catch (err) { next(err); }
};

// ─── COURSES ─────────────────────────────────────────────────────────────────
const getCourses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const { offset, limit: lim, page: pg } = paginate(page, limit);
    const result = await query(
      `SELECT c.*, d.name AS department_name,
        (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') AS student_count,
        (SELECT COUNT(*) FROM exams WHERE course_id = c.id) AS exam_count
       FROM courses c LEFT JOIN departments d ON d.id = c.department_id
       WHERE c.teacher_id = $1 AND (c.title ILIKE $2 OR c.code ILIKE $2)
       ORDER BY c.created_at DESC LIMIT $3 OFFSET $4`,
      [req.user.id, `%${search}%`, lim, offset]
    );
    const total = await query(`SELECT COUNT(*) FROM courses WHERE teacher_id = $1 AND (title ILIKE $2 OR code ILIKE $2)`, [req.user.id, `%${search}%`]);
    res.json({ success: true, courses: result.rows, pagination: paginationMeta(total.rows[0].count, pg, lim) });
  } catch (err) { next(err); }
};

const createCourse = async (req, res, next) => {
  try {
    const { title, code, description, credits, semester, academic_year, department_id } = req.body;
    const result = await query(
      `INSERT INTO courses (title, code, description, credits, semester, academic_year, department_id, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [title, code, description, credits || 3, semester, academic_year, department_id, req.user.id]
    );
    await logAction({ userId: req.user.id, action: 'CREATE_COURSE', entityType: 'course', entityId: result.rows[0].id, details: { title }, ipAddress: getClientIp(req) });
    res.status(201).json({ success: true, message: 'Course created', course: result.rows[0] });
  } catch (err) { next(err); }
};

const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, code, description, credits, semester, academic_year, is_active } = req.body;
    const result = await query(
      `UPDATE courses SET title=$1, code=$2, description=$3, credits=$4, semester=$5, academic_year=$6, is_active=$7
       WHERE id=$8 AND teacher_id=$9 RETURNING *`,
      [title, code, description, credits, semester, academic_year, is_active, id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, message: 'Course updated', course: result.rows[0] });
  } catch (err) { next(err); }
};

// ─── EXAMS ───────────────────────────────────────────────────────────────────
const getExams = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', course_id, status } = req.query;
    const { offset, limit: lim, page: pg } = paginate(page, limit);
    let conditions = [`e.teacher_id = $1`];
    let params = [req.user.id];
    if (search) { conditions.push(`e.title ILIKE $${params.length+1}`); params.push(`%${search}%`); }
    if (course_id) { conditions.push(`e.course_id = $${params.length+1}`); params.push(course_id); }
    if (status) { conditions.push(`e.status = $${params.length+1}`); params.push(status); }
    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT e.*, c.title AS course_title,
        (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) AS question_count,
        (SELECT COUNT(*) FROM submissions WHERE exam_id = e.id) AS submission_count
       FROM exams e LEFT JOIN courses c ON c.id = e.course_id
       WHERE ${where} ORDER BY e.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, lim, offset]
    );
    const total = await query(`SELECT COUNT(*) FROM exams e WHERE ${where}`, params);
    res.json({ success: true, exams: result.rows, pagination: paginationMeta(total.rows[0].count, pg, lim) });
  } catch (err) { next(err); }
};

const getExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const examResult = await query(
      `SELECT e.*, c.title AS course_title FROM exams e
       LEFT JOIN courses c ON c.id = e.course_id
       WHERE e.id = $1 AND e.teacher_id = $2`, [id, req.user.id]
    );
    if (examResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });
    const questions = await query(`SELECT * FROM questions WHERE exam_id = $1 ORDER BY order_index, id`, [id]);
    res.json({ success: true, exam: examResult.rows[0], questions: questions.rows });
  } catch (err) { next(err); }
};

const createExam = async (req, res, next) => {
  try {
    const { title, description, instructions, course_id, exam_type, start_time, end_time, duration_minutes, total_marks, pass_marks, negative_marking, shuffle_questions } = req.body;
    const result = await query(
      `INSERT INTO exams (title, description, instructions, course_id, teacher_id, exam_type, start_time, end_time, duration_minutes, total_marks, pass_marks, negative_marking, shuffle_questions, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'draft') RETURNING *`,
      [title, description, instructions, course_id, req.user.id, exam_type || 'quiz', start_time, end_time, duration_minutes || 60, total_marks || 100, pass_marks || 40, negative_marking || 0, shuffle_questions || false]
    );
    await logAction({ userId: req.user.id, action: 'CREATE_EXAM', entityType: 'exam', entityId: result.rows[0].id, details: { title }, ipAddress: getClientIp(req) });
    res.status(201).json({ success: true, message: 'Exam created', ...result.rows[0], id: result.rows[0].id });
  } catch (err) { next(err); }
};

const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, instructions, course_id, exam_type, start_time, end_time, duration_minutes, total_marks, pass_marks, negative_marking, shuffle_questions, status } = req.body;
    const result = await query(
      `UPDATE exams SET title=$1, description=$2, instructions=$3, course_id=$4, exam_type=$5, start_time=$6, end_time=$7, duration_minutes=$8, total_marks=$9, pass_marks=$10, negative_marking=$11, shuffle_questions=$12, status=COALESCE($13, status)
       WHERE id=$14 AND teacher_id=$15 RETURNING *`,
      [title, description, instructions, course_id, exam_type, start_time, end_time, duration_minutes, total_marks, pass_marks, negative_marking, shuffle_questions, status, id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, message: 'Exam updated', exam: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const check = await query(`SELECT status FROM exams WHERE id=$1 AND teacher_id=$2`, [id, req.user.id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });
    if (['active', 'completed', 'results_published'].includes(check.rows[0].status)) {
      return res.status(400).json({ success: false, message: 'Cannot delete an active or completed exam' });
    }
    await query('DELETE FROM exams WHERE id = $1', [id]);
    res.json({ success: true, message: 'Exam deleted' });
  } catch (err) { next(err); }
};

// ─── QUESTIONS ────────────────────────────────────────────────────────────────
const addQuestion = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { question_text, question_type, options, correct_answer, explanation, marks, order_index } = req.body;
    // Verify exam belongs to teacher
    const exam = await query(`SELECT id FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (exam.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });
    const result = await query(
      `INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, explanation, marks, order_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [examId, question_text, question_type, options ? JSON.stringify(options) : null, correct_answer, explanation, marks || 1, order_index || 0]
    );
    res.status(201).json({ success: true, message: 'Question added', question: result.rows[0] });
  } catch (err) { next(err); }
};

const updateQuestion = async (req, res, next) => {
  try {
    const { examId, qId } = req.params;
    const { question_text, question_type, options, correct_answer, explanation, marks, order_index } = req.body;
    const exam = await query(`SELECT id FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (exam.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });
    const result = await query(
      `UPDATE questions SET question_text=$1, question_type=$2, options=$3, correct_answer=$4, explanation=$5, marks=$6, order_index=$7
       WHERE id=$8 AND exam_id=$9 RETURNING *`,
      [question_text, question_type, options ? JSON.stringify(options) : null, correct_answer, explanation, marks, order_index, qId, examId]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Question not found' });
    res.json({ success: true, message: 'Question updated', question: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const { examId, qId } = req.params;
    const exam = await query(`SELECT id FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (exam.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });
    await query('DELETE FROM questions WHERE id=$1 AND exam_id=$2', [qId, examId]);
    res.json({ success: true, message: 'Question deleted' });
  } catch (err) { next(err); }
};

// ─── SUBMISSIONS & GRADING ────────────────────────────────────────────────────
const getSubmissions = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const { page = 1, limit = 20, search = '' } = req.query;
    const { offset, limit: lim, page: pg } = paginate(page, limit);
    const exam = await query(`SELECT id, title, total_marks FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (exam.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });
    const result = await query(
      `SELECT s.*, u.name AS student_name, u.email AS student_email, u.student_id,
              r.marks_obtained, r.percentage, r.grade, r.is_published,
              (SELECT COUNT(*) FROM answers a JOIN questions q ON q.id = a.question_id
               WHERE a.submission_id = s.id AND q.question_type = 'short_answer' AND a.is_correct IS NULL) AS pending_grading
       FROM submissions s
       JOIN users u ON u.id = s.student_id
       LEFT JOIN results r ON r.submission_id = s.id
       WHERE s.exam_id = $1 AND (u.name ILIKE $2 OR u.email ILIKE $2)
       ORDER BY s.submitted_at DESC LIMIT $3 OFFSET $4`,
      [examId, `%${search}%`, lim, offset]
    );
    const total = await query(
      `SELECT COUNT(*) FROM submissions s JOIN users u ON u.id = s.student_id WHERE s.exam_id = $1 AND (u.name ILIKE $2 OR u.email ILIKE $2)`,
      [examId, `%${search}%`]
    );
    res.json({ success: true, exam: exam.rows[0], submissions: result.rows, pagination: paginationMeta(total.rows[0].count, pg, lim) });
  } catch (err) { next(err); }
};

const gradeSubmission = async (req, res, next) => {
  try {
    const { subId } = req.params;
    const { grades } = req.body; // Array of { question_id, marks_awarded, feedback }

    // Verify submission belongs to teacher's exam
    const sub = await query(
      `SELECT s.*, e.total_marks, e.pass_marks, e.negative_marking FROM submissions s
       JOIN exams e ON e.id = s.exam_id WHERE s.id=$1 AND e.teacher_id=$2`,
      [subId, req.user.id]
    );
    if (sub.rows.length === 0) return res.status(404).json({ success: false, message: 'Submission not found' });

    // Apply manual grades for short_answer
    for (const g of grades) {
      await query(
        `UPDATE answers SET marks_awarded=$1, teacher_feedback=$2, is_correct=$3, graded_at=NOW()
         WHERE submission_id=$4 AND question_id=$5`,
        [g.marks_awarded, g.feedback || null, g.marks_awarded > 0, subId, g.question_id]
      );
    }

    // Recalculate total score
    const marksResult = await query(
      `SELECT COALESCE(SUM(marks_awarded), 0) AS total FROM answers WHERE submission_id = $1`,
      [subId]
    );
    const marksObtained = parseFloat(marksResult.rows[0].total);
    const percentage = (marksObtained / sub.rows[0].total_marks) * 100;
    const isPassed = marksObtained >= sub.rows[0].pass_marks;
    const grade = calculateGrade(percentage);

    // Upsert result
    await query(
      `INSERT INTO results (submission_id, student_id, exam_id, total_marks, marks_obtained, percentage, grade, is_passed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (submission_id) DO UPDATE SET
         marks_obtained=$5, percentage=$6, grade=$7, is_passed=$8, updated_at=NOW()`,
      [subId, sub.rows[0].student_id, sub.rows[0].exam_id, sub.rows[0].total_marks, marksObtained, percentage.toFixed(2), grade, isPassed]
    );

    await query(`UPDATE submissions SET status='graded' WHERE id=$1`, [subId]);
    await logAction({ userId: req.user.id, action: 'GRADE_SUBMISSION', entityType: 'submission', entityId: parseInt(subId), details: { marks_obtained: marksObtained }, ipAddress: getClientIp(req) });
    res.json({ success: true, message: 'Grading saved', marks_obtained: marksObtained, percentage: percentage.toFixed(2), grade });
  } catch (err) { next(err); }
};

const publishResults = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await query(`SELECT id FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (exam.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });
    await query(`UPDATE results SET is_published=true, published_at=NOW() WHERE exam_id=$1`, [examId]);
    await query(`UPDATE exams SET status='results_published' WHERE id=$1`, [examId]);
    await logAction({ userId: req.user.id, action: 'PUBLISH_RESULTS', entityType: 'exam', entityId: parseInt(examId), ipAddress: getClientIp(req) });
    res.json({ success: true, message: 'Results published successfully' });
  } catch (err) { next(err); }
};

const getAnalytics = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await query(
      `SELECT e.*, c.title AS course_title FROM exams e LEFT JOIN courses c ON c.id = e.course_id
       WHERE e.id=$1 AND e.teacher_id=$2`, [examId, req.user.id]
    );
    if (exam.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });

    const stats = await query(
      `SELECT 
        COUNT(r.*) AS total_students,
        ROUND(AVG(r.percentage), 2) AS average_percentage,
        ROUND(MAX(r.marks_obtained), 2) AS highest_marks,
        ROUND(MIN(r.marks_obtained), 2) AS lowest_marks,
        COUNT(*) FILTER (WHERE r.is_passed=true) AS passed_count,
        COUNT(*) FILTER (WHERE r.is_passed=false) AS failed_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE r.is_passed=true) / NULLIF(COUNT(*), 0), 2) AS pass_percentage
       FROM results r WHERE r.exam_id=$1`, [examId]
    );

    const gradeDistribution = await query(
      `SELECT grade, COUNT(*) AS count FROM results WHERE exam_id=$1 GROUP BY grade ORDER BY grade`, [examId]
    );

    const questionAnalysis = await query(
      `SELECT q.id, q.question_text, q.question_type, q.marks,
        COUNT(a.*) AS attempts,
        COUNT(*) FILTER (WHERE a.is_correct=true) AS correct_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE a.is_correct=true) / NULLIF(COUNT(a.*), 0), 2) AS correct_percentage
       FROM questions q LEFT JOIN answers a ON a.question_id = q.id
       WHERE q.exam_id=$1 GROUP BY q.id ORDER BY q.order_index`, [examId]
    );

    res.json({
      success: true,
      exam: exam.rows[0],
      stats: stats.rows[0],
      grade_distribution: gradeDistribution.rows,
      question_analysis: questionAnalysis.rows
    });
  } catch (err) { next(err); }
};

// ─── PHASE 2/3/4 ADVANCED FEATURES ─────────────────────────────────────────
const getReasoningGraph = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const examCheck = await query(`SELECT id FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (examCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });

    const questionStats = await query(
      `SELECT q.id, q.question_text, q.marks,
              COUNT(a.*) AS attempts,
              COUNT(*) FILTER (WHERE a.is_correct = false OR (a.is_correct IS NULL AND a.marks_awarded < q.marks)) AS incorrect
       FROM questions q
       LEFT JOIN answers a ON a.question_id = q.id
       LEFT JOIN submissions s ON s.id = a.submission_id
       WHERE q.exam_id=$1 AND (s.id IS NULL OR s.status IN ('submitted', 'graded'))
       GROUP BY q.id
       ORDER BY q.order_index, q.id`,
      [examId]
    );

    const conceptMap = {};
    for (const row of questionStats.rows) {
      const concepts = extractConcepts(row.question_text, 3);
      for (const concept of concepts) {
        if (!conceptMap[concept]) conceptMap[concept] = { concept, attempts: 0, incorrect: 0, linked_questions: [] };
        conceptMap[concept].attempts += safeNumber(row.attempts);
        conceptMap[concept].incorrect += safeNumber(row.incorrect);
        conceptMap[concept].linked_questions.push(row.id);
      }
    }

    const graph = Object.values(conceptMap)
      .map((c) => ({
        ...c,
        risk: c.attempts > 0 ? Number((c.incorrect / c.attempts).toFixed(2)) : 0
      }))
      .sort((a, b) => b.risk - a.risk);

    res.json({ success: true, exam_id: Number(examId), concept_graph: graph });
  } catch (err) { next(err); }
};

const getQuestionQualityRadar = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const examCheck = await query(`SELECT id FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (examCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });

    const data = await query(
      `SELECT q.id, q.question_text, q.marks,
              COUNT(a.*) AS attempts,
              COUNT(*) FILTER (WHERE a.is_correct = true) AS correct,
              COALESCE(AVG(a.marks_awarded), 0) AS avg_marks
       FROM questions q
       LEFT JOIN answers a ON a.question_id = q.id
       LEFT JOIN submissions s ON s.id = a.submission_id
       WHERE q.exam_id=$1 AND (s.id IS NULL OR s.status IN ('submitted', 'graded'))
       GROUP BY q.id
       ORDER BY q.order_index, q.id`,
      [examId]
    );

    const radar = data.rows.map((row) => ({
      question_id: row.id,
      question_preview: row.question_text.slice(0, 90),
      ...calculateQuestionQuality({
        attempts: row.attempts,
        correct: row.correct,
        avgMarks: row.avg_marks,
        maxMarks: row.marks
      })
    }));

    res.json({ success: true, exam_id: Number(examId), radar });
  } catch (err) { next(err); }
};

const getPlagiarismStyleRisk = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const examCheck = await query(`SELECT id FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (examCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });

    const answers = await query(
      `SELECT a.id, a.answer_text, s.student_id, u.name AS student_name, q.id AS question_id
       FROM answers a
       JOIN submissions s ON s.id = a.submission_id
       JOIN users u ON u.id = s.student_id
       JOIN questions q ON q.id = a.question_id
       WHERE s.exam_id=$1 AND q.question_type='short_answer' AND COALESCE(a.answer_text, '') <> ''`,
      [examId]
    );

    const byQuestion = {};
    for (const row of answers.rows) {
      if (!byQuestion[row.question_id]) byQuestion[row.question_id] = [];
      byQuestion[row.question_id].push(row);
    }

    const riskRows = [];
    for (const rows of Object.values(byQuestion)) {
      for (let i = 0; i < rows.length; i++) {
        let maxSimilarity = 0;
        let matchedStudent = null;
        for (let j = 0; j < rows.length; j++) {
          if (i === j) continue;
          const sim = jaccardSimilarity(rows[i].answer_text, rows[j].answer_text);
          if (sim > maxSimilarity) {
            maxSimilarity = sim;
            matchedStudent = rows[j].student_name;
          }
        }

        const history = await query(
          `SELECT AVG(LENGTH(COALESCE(a.answer_text, ''))) AS avg_len
           FROM answers a
           JOIN submissions s ON s.id = a.submission_id
           JOIN questions q ON q.id = a.question_id
           WHERE s.student_id=$1 AND s.exam_id <> $2 AND q.question_type='short_answer'`,
          [rows[i].student_id, examId]
        );

        const currentLen = (rows[i].answer_text || '').length;
        const historicalAvg = safeNumber(history.rows[0]?.avg_len, currentLen || 1);
        const drift = historicalAvg > 0 ? Math.abs(currentLen - historicalAvg) / historicalAvg : 0;
        const riskScore = Math.round(Math.min(100, maxSimilarity * 70 + drift * 30));

        riskRows.push({
          student_id: rows[i].student_id,
          student_name: rows[i].student_name,
          question_id: rows[i].question_id,
          plagiarism_similarity: Number(maxSimilarity.toFixed(2)),
          closest_match: matchedStudent,
          style_drift: Number(drift.toFixed(2)),
          risk_score: riskScore
        });
      }
    }

    riskRows.sort((a, b) => b.risk_score - a.risk_score);
    res.json({ success: true, exam_id: Number(examId), risks: riskRows.slice(0, 30) });
  } catch (err) { next(err); }
};

const getWorkloadBalancer = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const examCheck = await query(`SELECT id FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (examCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });

    const pending = await query(
      `SELECT s.id AS submission_id, s.submitted_at, u.name AS student_name,
              COUNT(*) FILTER (WHERE q.question_type='short_answer' AND a.graded_at IS NULL) AS pending_short_answers
       FROM submissions s
       JOIN users u ON u.id = s.student_id
       LEFT JOIN answers a ON a.submission_id = s.id
       LEFT JOIN questions q ON q.id = a.question_id
       WHERE s.exam_id=$1 AND s.status IN ('submitted', 'graded')
       GROUP BY s.id, u.name
       ORDER BY s.submitted_at ASC`,
      [examId]
    );

    const queue = pending.rows
      .filter((r) => safeNumber(r.pending_short_answers) > 0)
      .map((r, idx) => ({
        priority_rank: idx + 1,
        submission_id: r.submission_id,
        student_name: r.student_name,
        pending_short_answers: safeNumber(r.pending_short_answers),
        estimated_minutes: safeNumber(r.pending_short_answers) * 2,
        submitted_at: r.submitted_at
      }));

    res.json({ success: true, exam_id: Number(examId), grading_queue: queue });
  } catch (err) { next(err); }
};

const runAdaptiveVivaTrigger = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await query(`SELECT * FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (exam.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });
    const examRow = exam.rows[0];

    const scored = await query(
      `SELECT r.submission_id, r.student_id, r.percentage, s.time_taken, s.tab_switches, u.name AS student_name
       FROM results r
       JOIN submissions s ON s.id = r.submission_id
       JOIN users u ON u.id = r.student_id
       WHERE r.exam_id=$1`,
      [examId]
    );

    const flags = [];
    for (const row of scored.rows) {
      const baseline = await query(
        `SELECT AVG(r.percentage) AS avg_percentage,
                COALESCE(STDDEV_POP(r.percentage), 0) AS std_percentage
         FROM results r
         JOIN exams e ON e.id = r.exam_id
         WHERE r.student_id=$1 AND e.course_id=$2 AND r.exam_id <> $3`,
        [row.student_id, examRow.course_id, examId]
      );
      const avg = safeNumber(baseline.rows[0]?.avg_percentage, 0);
      const std = safeNumber(baseline.rows[0]?.std_percentage, 0);
      const threshold = avg + Math.max(12, std * 1.5);
      const quickFinish = safeNumber(row.time_taken, 0) < safeNumber(examRow.duration_minutes, 60) * 60 * 0.25;
      const suspicious = avg > 0 && safeNumber(row.percentage) > threshold && (safeNumber(row.tab_switches) >= 5 || quickFinish);
      if (suspicious) {
        flags.push({
          submission_id: row.submission_id,
          student_id: row.student_id,
          student_name: row.student_name,
          percentage: safeNumber(row.percentage),
          baseline_avg: Number(avg.toFixed(2)),
          baseline_std: Number(std.toFixed(2)),
          reason: quickFinish ? 'High score with unusually fast completion' : 'High score with elevated behavior risk'
        });
      }
    }

    await logAction({
      userId: req.user.id,
      action: 'RUN_ADAPTIVE_VIVA_TRIGGER',
      entityType: 'exam',
      entityId: Number(examId),
      details: { flagged_count: flags.length },
      ipAddress: getClientIp(req)
    });

    res.json({ success: true, exam_id: Number(examId), flagged_students: flags });
  } catch (err) { next(err); }
};

const equateExamScores = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await query(`SELECT * FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (exam.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });

    const currentStats = await query(
      `SELECT AVG(percentage) AS mean, COALESCE(STDDEV_POP(percentage), 0) AS std
       FROM results WHERE exam_id=$1`,
      [examId]
    );

    const referenceStats = await query(
      `SELECT AVG(r.percentage) AS mean, COALESCE(STDDEV_POP(r.percentage), 0) AS std
       FROM results r
       JOIN exams e ON e.id = r.exam_id
       WHERE e.course_id=$1 AND r.exam_id <> $2`,
      [exam.rows[0].course_id, examId]
    );

    const meanCurr = safeNumber(currentStats.rows[0]?.mean, 0);
    const stdCurr = safeNumber(currentStats.rows[0]?.std, 1);
    const meanRef = safeNumber(referenceStats.rows[0]?.mean, meanCurr);
    const stdRef = safeNumber(referenceStats.rows[0]?.std, stdCurr);

    const raw = await query(
      `SELECT r.submission_id, r.student_id, u.name AS student_name, r.percentage
       FROM results r
       JOIN users u ON u.id = r.student_id
       WHERE r.exam_id=$1`,
      [examId]
    );

    const equated = raw.rows.map((row) => ({
      submission_id: row.submission_id,
      student_id: row.student_id,
      student_name: row.student_name,
      raw_percentage: safeNumber(row.percentage),
      equated_percentage: equateScore(row.percentage, meanCurr, stdCurr, meanRef, stdRef)
    }));

    res.json({
      success: true,
      exam_id: Number(examId),
      model: { cohort_mean: meanCurr, cohort_std: stdCurr, reference_mean: meanRef, reference_std: stdRef },
      equated
    });
  } catch (err) { next(err); }
};

const getDigitalTwin = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await query(`SELECT * FROM exams WHERE id=$1 AND teacher_id=$2`, [examId, req.user.id]);
    if (exam.rows.length === 0) return res.status(404).json({ success: false, message: 'Exam not found' });
    const examRow = exam.rows[0];

    const questions = await query(
      `SELECT q.id, q.marks,
              COALESCE(AVG(CASE
                WHEN q.question_type IN ('mcq', 'true_false') AND a.is_correct = true THEN 1
                WHEN q.question_type = 'short_answer' THEN a.marks_awarded / NULLIF(q.marks, 0)
                ELSE 0 END), 0.5) AS expected_ratio
       FROM questions q
       LEFT JOIN answers a ON a.question_id = q.id
       LEFT JOIN submissions s ON s.id = a.submission_id
       WHERE q.exam_id=$1 AND (s.id IS NULL OR s.status IN ('submitted', 'graded'))
       GROUP BY q.id`,
      [examId]
    );

    const simulate = (factor) => {
      const runs = 300;
      let passCount = 0;
      let totalPct = 0;
      for (let i = 0; i < runs; i++) {
        let marks = 0;
        for (const q of questions.rows) {
          const baseRatio = Math.max(0, Math.min(1, safeNumber(q.expected_ratio, 0.5) * factor));
          const noisy = Math.max(0, Math.min(1, baseRatio + (Math.random() - 0.5) * 0.15));
          marks += noisy * safeNumber(q.marks, 1);
        }
        const pct = (marks / Math.max(1, safeNumber(examRow.total_marks, 100))) * 100;
        totalPct += pct;
        if (marks >= safeNumber(examRow.pass_marks, 40)) passCount++;
      }
      return {
        expected_avg_percentage: Number((totalPct / runs).toFixed(2)),
        expected_pass_rate: Number(((passCount / runs) * 100).toFixed(2))
      };
    };

    res.json({
      success: true,
      exam_id: Number(examId),
      twin: {
        weak_cohort: simulate(0.75),
        average_cohort: simulate(1),
        strong_cohort: simulate(1.2)
      }
    });
  } catch (err) { next(err); }
};

module.exports = {
  getDashboard, getCourses, createCourse, updateCourse,
  getExams, getExam, createExam, updateExam, deleteExam,
  addQuestion, updateQuestion, deleteQuestion,
  getSubmissions, gradeSubmission, publishResults, getAnalytics,
  getReasoningGraph, getQuestionQualityRadar, getPlagiarismStyleRisk,
  getWorkloadBalancer, runAdaptiveVivaTrigger, equateExamScores, getDigitalTwin
};
