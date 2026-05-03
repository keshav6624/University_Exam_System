/**
 * Admin Controller - Full admin portal functionality
 */
const bcrypt = require('bcryptjs');
const csv = require('csv-parser');
const fs = require('fs');
const { query, withTransaction } = require('../config/database');
const { paginate, paginationMeta, getClientIp } = require('../utils/helpers');
const { logAction } = require('../utils/logger');

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const [users, exams, courses, departments, submissions, recentActivity] = await Promise.all([
      query(`SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE role='student') AS students,
        COUNT(*) FILTER (WHERE role='teacher') AS teachers,
        COUNT(*) FILTER (WHERE status='active') AS active_users
        FROM users WHERE role != 'admin'`),
      query(`SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='published' OR status='active') AS active_exams,
        COUNT(*) FILTER (WHERE status='completed' OR status='results_published') AS completed
        FROM exams`),
      query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active=true) AS active FROM courses`),
      query(`SELECT COUNT(*) AS total FROM departments`),
      query(`SELECT COUNT(*) AS total FROM submissions`),
      query(`SELECT l.*, u.name AS user_name, u.role FROM system_logs l
             LEFT JOIN users u ON u.id = l.user_id ORDER BY l.created_at DESC LIMIT 10`)
    ]);
    const usersRow = users.rows[0] || {};
    const examsRow = exams.rows[0] || {};
    const coursesRow = courses.rows[0] || {};
    const departmentsRow = departments.rows[0] || {};
    const submissionsRow = submissions.rows[0] || {};

    res.json({
      success: true,
      stats: {
        students: usersRow.students || '0',
        teachers: usersRow.teachers || '0',
        departments: departmentsRow.total || '0',
        courses: coursesRow.total || '0',
        exams: examsRow.total || '0',
        submissions: submissionsRow.total || '0',
        users: usersRow,
        exams_breakdown: examsRow,
        courses_breakdown: coursesRow,
      },
      recent_activity: recentActivity.rows
    });
  } catch (err) { next(err); }
};

// ─── DEPARTMENTS ─────────────────────────────────────────────────────────────
const getDepartments = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const { offset, limit: lim, page: pg } = paginate(page, limit);
    const searchParam = `%${search}%`;
    const result = await query(
      `SELECT d.*, 
        (SELECT COUNT(*) FROM users WHERE department_id = d.id) AS user_count,
        (SELECT COUNT(*) FROM courses WHERE department_id = d.id) AS course_count
       FROM departments d
       WHERE d.name ILIKE $1 OR d.code ILIKE $1
       ORDER BY d.name LIMIT $2 OFFSET $3`,
      [searchParam, lim, offset]
    );
    const total = await query(`SELECT COUNT(*) FROM departments WHERE name ILIKE $1 OR code ILIKE $1`, [searchParam]);
    res.json({ success: true, departments: result.rows, pagination: paginationMeta(total.rows[0].count, pg, lim) });
  } catch (err) { next(err); }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;
    const result = await query(
      `INSERT INTO departments (name, code, description) VALUES ($1, $2, $3) RETURNING *`,
      [name, code.toUpperCase(), description]
    );
    await logAction({ userId: req.user.id, action: 'CREATE_DEPARTMENT', entityType: 'department', entityId: result.rows[0].id, details: { name }, ipAddress: getClientIp(req) });
    res.status(201).json({ success: true, message: 'Department created', department: result.rows[0] });
  } catch (err) { next(err); }
};

const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, is_active } = req.body;
    const result = await query(
      `UPDATE departments SET name=$1, code=$2, description=$3, is_active=$4 WHERE id=$5 RETURNING *`,
      [name, code?.toUpperCase(), description, is_active, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, message: 'Department updated', department: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const users = await query('SELECT COUNT(*) FROM users WHERE department_id = $1', [id]);
    if (parseInt(users.rows[0].count) > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete department with assigned users' });
    }
    await query('DELETE FROM departments WHERE id = $1', [id]);
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) { next(err); }
};

// ─── TEACHERS ────────────────────────────────────────────────────────────────
const getTeachers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', department_id } = req.query;
    const { offset, limit: lim, page: pg } = paginate(page, limit);
    let conditions = [`u.role = 'teacher'`];
    let params = [];
    if (search) { conditions.push(`(u.name ILIKE $${params.length+1} OR u.email ILIKE $${params.length+1})`); params.push(`%${search}%`); }
    if (department_id) { conditions.push(`u.department_id = $${params.length+1}`); params.push(department_id); }
    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT u.id, u.name, u.email, u.status, u.employee_id, u.phone, u.last_login, u.created_at,
              d.name AS department_name,
              (SELECT COUNT(*) FROM courses WHERE teacher_id = u.id) AS course_count
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
       WHERE ${where} ORDER BY u.name LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, lim, offset]
    );
    const total = await query(`SELECT COUNT(*) FROM users u WHERE ${where}`, params);
    res.json({ success: true, teachers: result.rows, pagination: paginationMeta(total.rows[0].count, pg, lim) });
  } catch (err) { next(err); }
};

const createTeacher = async (req, res, next) => {
  try {
    const { name, email, password, department_id, employee_id, phone } = req.body;
    const hashed = await bcrypt.hash(password || 'Password@123', 12);
    const result = await query(
      `INSERT INTO users (name, email, password, role, department_id, employee_id, phone)
       VALUES ($1, $2, $3, 'teacher', $4, $5, $6) RETURNING id, name, email, role, status`,
      [name, email.toLowerCase(), hashed, department_id, employee_id, phone]
    );
    await logAction({ userId: req.user.id, action: 'CREATE_TEACHER', entityType: 'user', entityId: result.rows[0].id, details: { name, email }, ipAddress: getClientIp(req) });
    res.status(201).json({ success: true, message: 'Teacher created', teacher: result.rows[0] });
  } catch (err) { next(err); }
};

const updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, department_id, employee_id, phone } = req.body;
    const result = await query(
      `UPDATE users SET name=$1, email=$2, department_id=$3, employee_id=$4, phone=$5 WHERE id=$6 AND role='teacher' RETURNING *`,
      [name, email?.toLowerCase(), department_id, employee_id, phone, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Teacher not found' });
    res.json({ success: true, message: 'Teacher updated', teacher: result.rows[0] });
  } catch (err) { next(err); }
};

// ─── STUDENTS ────────────────────────────────────────────────────────────────
const getStudents = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', department_id } = req.query;
    const { offset, limit: lim, page: pg } = paginate(page, limit);
    let conditions = [`u.role = 'student'`];
    let params = [];
    if (search) { conditions.push(`(u.name ILIKE $${params.length+1} OR u.email ILIKE $${params.length+1} OR u.student_id ILIKE $${params.length+1})`); params.push(`%${search}%`); }
    if (department_id) { conditions.push(`u.department_id = $${params.length+1}`); params.push(department_id); }
    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT u.id, u.name, u.email, u.status, u.student_id, u.phone, u.last_login, u.created_at,
              d.name AS department_name,
              (SELECT COUNT(*) FROM enrollments WHERE student_id = u.id) AS enrollment_count
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
       WHERE ${where} ORDER BY u.name LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, lim, offset]
    );
    const total = await query(`SELECT COUNT(*) FROM users u WHERE ${where}`, params);
    res.json({ success: true, students: result.rows, pagination: paginationMeta(total.rows[0].count, pg, lim) });
  } catch (err) { next(err); }
};

const createStudent = async (req, res, next) => {
  try {
    const { name, email, password, department_id, student_id, phone } = req.body;
    const hashed = await bcrypt.hash(password || 'Password@123', 12);
    const result = await query(
      `INSERT INTO users (name, email, password, role, department_id, student_id, phone)
       VALUES ($1, $2, $3, 'student', $4, $5, $6) RETURNING id, name, email, role, status`,
      [name, email.toLowerCase(), hashed, department_id, student_id, phone]
    );
    await logAction({ userId: req.user.id, action: 'CREATE_STUDENT', entityType: 'user', entityId: result.rows[0].id, details: { name, email }, ipAddress: getClientIp(req) });
    res.status(201).json({ success: true, message: 'Student created', student: result.rows[0] });
  } catch (err) { next(err); }
};

const bulkUploadStudents = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'CSV file required' });
    const students = [];
    const errors = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', row => students.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    let created = 0;
    for (const [i, s] of students.entries()) {
      if (!s.name || !s.email) { errors.push(`Row ${i+2}: name and email required`); continue; }
      try {
        const hashed = await bcrypt.hash(s.password || 'Password@123', 12);
        await query(
          `INSERT INTO users (name, email, password, role, department_id, student_id, phone)
           VALUES ($1, $2, $3, 'student', $4, $5, $6) ON CONFLICT (email) DO NOTHING`,
          [s.name, s.email.toLowerCase(), hashed, s.department_id || null, s.student_id || null, s.phone || null]
        );
        created++;
      } catch (e) { errors.push(`Row ${i+2}: ${e.message}`); }
    }

    fs.unlinkSync(req.file.path);
    await logAction({ userId: req.user.id, action: 'BULK_UPLOAD_STUDENTS', details: { total: students.length, created, errors: errors.length }, ipAddress: getClientIp(req) });
    res.json({ success: true, message: `${created} students created`, created, errors });
  } catch (err) { next(err); }
};

// ─── USER STATUS ─────────────────────────────────────────────────────────────
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'suspended', 'inactive'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const result = await query(
      `UPDATE users SET status=$1 WHERE id=$2 AND role != 'admin' RETURNING id, name, email, status, role`,
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    await logAction({ userId: req.user.id, action: 'UPDATE_USER_STATUS', entityType: 'user', entityId: parseInt(id), details: { status, targetUser: result.rows[0].name }, ipAddress: getClientIp(req) });
    res.json({ success: true, message: `User ${status}`, user: result.rows[0] });
  } catch (err) { next(err); }
};

// ─── SYSTEM LOGS ─────────────────────────────────────────────────────────────
const getLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', action, role } = req.query;
    const { offset, limit: lim, page: pg } = paginate(page, limit);
    let conditions = ['1=1'];
    let params = [];
    if (search) { conditions.push(`(l.action ILIKE $${params.length+1} OR u.name ILIKE $${params.length+1})`); params.push(`%${search}%`); }
    if (action) { conditions.push(`l.action = $${params.length+1}`); params.push(action); }
    if (role) { conditions.push(`u.role = $${params.length+1}`); params.push(role); }
    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT l.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
       FROM system_logs l LEFT JOIN users u ON u.id = l.user_id
       WHERE ${where} ORDER BY l.created_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, lim, offset]
    );
    const total = await query(
      `SELECT COUNT(*) FROM system_logs l LEFT JOIN users u ON u.id = l.user_id WHERE ${where}`, params
    );
    res.json({ success: true, logs: result.rows, pagination: paginationMeta(total.rows[0].count, pg, lim) });
  } catch (err) { next(err); }
};

// ─── COURSES (ADMIN VIEW) ─────────────────────────────────────────────────────
const getCourses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const { offset, limit: lim, page: pg } = paginate(page, limit);
    const result = await query(
      `SELECT c.*, d.name AS department_name, u.name AS teacher_name,
              (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) AS student_count,
              (SELECT COUNT(*) FROM exams WHERE course_id = c.id) AS exam_count
       FROM courses c
       LEFT JOIN departments d ON d.id = c.department_id
       LEFT JOIN users u ON u.id = c.teacher_id
       WHERE c.title ILIKE $1 OR c.code ILIKE $1
       ORDER BY c.created_at DESC LIMIT $2 OFFSET $3`,
      [`%${search}%`, lim, offset]
    );
    const total = await query(`SELECT COUNT(*) FROM courses WHERE title ILIKE $1 OR code ILIKE $1`, [`%${search}%`]);
    res.json({ success: true, courses: result.rows, pagination: paginationMeta(total.rows[0].count, pg, lim) });
  } catch (err) { next(err); }
};

const assignCourse = async (req, res, next) => {
  try {
    const { course_id, student_ids } = req.body;
    let enrolled = 0;
    for (const sid of student_ids) {
      await query(
        `INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [sid, course_id]
      );
      enrolled++;
    }
    await logAction({ userId: req.user.id, action: 'ASSIGN_COURSE', entityType: 'course', entityId: course_id, details: { student_count: enrolled }, ipAddress: getClientIp(req) });
    res.json({ success: true, message: `${enrolled} students enrolled` });
  } catch (err) { next(err); }
};

const getDisputeAudit = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const submission = await query(
      `SELECT s.*, u.name AS student_name, u.email AS student_email,
              e.title AS exam_title, c.title AS course_title,
              r.marks_obtained, r.percentage, r.grade, r.is_passed
       FROM submissions s
       JOIN users u ON u.id = s.student_id
       JOIN exams e ON e.id = s.exam_id
       JOIN courses c ON c.id = e.course_id
       LEFT JOIN results r ON r.submission_id = s.id
       WHERE s.id=$1`,
      [submissionId]
    );

    if (submission.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const answers = await query(
      `SELECT a.question_id, q.question_text, q.marks, a.answer_text, a.marks_awarded, a.teacher_feedback, a.graded_at
       FROM answers a
       JOIN questions q ON q.id = a.question_id
       WHERE a.submission_id=$1
       ORDER BY q.order_index, q.id`,
      [submissionId]
    );

    const logs = await query(
      `SELECT action, details, ip_address, created_at
       FROM system_logs
       WHERE entity_id=$1 OR (details->>'submission_id')::int = $1
       ORDER BY created_at ASC`,
      [submissionId]
    );

    res.json({
      success: true,
      audit: {
        submission: submission.rows[0],
        answers: answers.rows,
        timeline: logs.rows,
        generated_at: new Date().toISOString()
      }
    });
  } catch (err) { next(err); }
};

module.exports = {
  getDashboard, getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getTeachers, createTeacher, updateTeacher,
  getStudents, createStudent, bulkUploadStudents,
  updateUserStatus, getLogs, getCourses, assignCourse, getDisputeAudit
};
