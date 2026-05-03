/**
 * Seed Data Script - Populates sample data for development/testing
 * Run: node utils/seedData.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

async function seed() {
  console.log('🌱 Seeding database...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Departments
    const deptResult = await client.query(`
      INSERT INTO departments (name, code, description) VALUES
      ('Computer Science', 'CS', 'Department of Computer Science & Engineering'),
      ('Mathematics', 'MATH', 'Department of Mathematics & Statistics'),
      ('Physics', 'PHY', 'Department of Physics'),
      ('Business Administration', 'BBA', 'Department of Business & Management')
      ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, code
    `);
    const depts = {};
    deptResult.rows.forEach(d => depts[d.code] = d.id);
    console.log('✅ Departments seeded');

    // Hash password
    const pass = await bcrypt.hash('Password@123', 12);

    // Admin
    await client.query(`
      INSERT INTO users (name, email, password, role) VALUES
      ('System Admin', 'admin@university.edu', $1, 'admin')
      ON CONFLICT (email) DO NOTHING
    `, [pass]);

    // Teachers
    const teacherResult = await client.query(`
      INSERT INTO users (name, email, password, role, department_id, employee_id) VALUES
      ('Dr. Sarah Johnson', 'teacher@university.edu', $1, 'teacher', $2, 'EMP001'),
      ('Prof. Michael Chen', 'michael.chen@university.edu', $1, 'teacher', $2, 'EMP002'),
      ('Dr. Emma Williams', 'emma.williams@university.edu', $1, 'teacher', $3, 'EMP003')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, name
    `, [pass, depts['CS'], depts['MATH']]);
    console.log('✅ Teachers seeded');

    // Students
    const studentResult = await client.query(`
      INSERT INTO users (name, email, password, role, department_id, student_id) VALUES
      ('Alice Thompson', 'student@university.edu', $1, 'student', $2, 'STU001'),
      ('Bob Martinez', 'bob.martinez@student.edu', $1, 'student', $2, 'STU002'),
      ('Carol Davis', 'carol.davis@student.edu', $1, 'student', $2, 'STU003'),
      ('David Wilson', 'david.wilson@student.edu', $1, 'student', $3, 'STU004'),
      ('Eve Anderson', 'eve.anderson@student.edu', $1, 'student', $2, 'STU005')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, name
    `, [pass, depts['CS'], depts['MATH']]);
    console.log('✅ Students seeded');

    // Get teacher/student IDs
    const teachers = await client.query(`SELECT id FROM users WHERE role='teacher' ORDER BY id LIMIT 3`);
    const students = await client.query(`SELECT id FROM users WHERE role='student' ORDER BY id LIMIT 5`);

    if (teachers.rows.length === 0 || students.rows.length === 0) {
      console.log('⚠️  Users already existed, skipping courses/exams seed');
      await client.query('ROLLBACK');
      return;
    }

    const t1 = teachers.rows[0].id;
    const t2 = teachers.rows[1]?.id || t1;

    // Courses
    const courseResult = await client.query(`
      INSERT INTO courses (title, code, description, department_id, teacher_id, credits, semester, academic_year) VALUES
      ('Data Structures & Algorithms', 'CS301', 'Core CS algorithms and data structures', $1, $2, 4, 'Fall', '2024-25'),
      ('Database Management Systems', 'CS302', 'Relational databases and SQL', $1, $2, 3, 'Fall', '2024-25'),
      ('Calculus I', 'MATH101', 'Differential and integral calculus', $3, $4, 3, 'Fall', '2024-25')
      ON CONFLICT (code) DO NOTHING
      RETURNING id
    `, [depts['CS'], t1, depts['MATH'], t2]);

    const courses = (await client.query(`SELECT id FROM courses ORDER BY id LIMIT 3`)).rows;
    if (courses.length === 0) { await client.query('ROLLBACK'); return; }

    // Enroll students in courses
    for (const s of students.rows) {
      for (const c of courses.slice(0, 2)) {
        await client.query(`
          INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [s.id, c.id]);
      }
    }
    console.log('✅ Courses & enrollments seeded');

    // Create a sample exam
    const now = new Date();
    const startTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now

    const examResult = await client.query(`
      INSERT INTO exams (title, description, instructions, course_id, teacher_id, exam_type, start_time, end_time, duration_minutes, total_marks, pass_marks, negative_marking, shuffle_questions, status)
      VALUES ($1, $2, $3, $4, $5, 'quiz', $6, $7, 30, 20, 8, 0.25, true, 'published')
      RETURNING id
    `, [
      'Data Structures Quiz 1',
      'Quiz covering arrays, linked lists, and stacks',
      '1. Read all questions carefully\n2. Each MCQ has one correct answer\n3. Negative marking applies\n4. Do not switch tabs during exam',
      courses[0].id, t1, startTime.toISOString(), endTime.toISOString()
    ]);

    const examId = examResult.rows[0].id;

    // Questions
    await client.query(`
      INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, marks, order_index) VALUES
      ($1, 'What is the time complexity of accessing an element in an array by index?', 'mcq',
       '[{"text":"O(n)"},{"text":"O(1)"},{"text":"O(log n)"},{"text":"O(n²)"}]', 'O(1)', 2, 1),
      ($1, 'A stack follows LIFO (Last In, First Out) order.', 'true_false', null, 'True', 2, 2),
      ($1, 'Which data structure uses nodes with pointers to next elements?', 'mcq',
       '[{"text":"Array"},{"text":"Linked List"},{"text":"Stack"},{"text":"Queue"}]', 'Linked List', 2, 3),
      ($1, 'What operation removes an element from a stack?', 'mcq',
       '[{"text":"push"},{"text":"enqueue"},{"text":"pop"},{"text":"dequeue"}]', 'pop', 2, 4),
      ($1, 'Binary search requires the array to be sorted.', 'true_false', null, 'True', 2, 5),
      ($1, 'Briefly explain the difference between a stack and a queue.', 'short_answer', null, null, 4, 6),
      ($1, 'What is the space complexity of a singly linked list with n elements?', 'mcq',
       '[{"text":"O(1)"},{"text":"O(log n)"},{"text":"O(n)"},{"text":"O(n²)"}]', 'O(n)', 2, 7),
      ($1, 'Arrays have dynamic size in most programming languages.', 'true_false', null, 'False', 2, 8)
    `, [examId]);

    console.log('✅ Sample exam and questions seeded');
    await client.query('COMMIT');

    console.log('\n🎉 Seeding complete!\n');
    console.log('📋 Login Credentials (all passwords: Password@123)');
    console.log('─'.repeat(50));
    console.log('👑 Admin:   admin@university.edu');
    console.log('👨‍🏫 Teacher: teacher@university.edu');
    console.log('👨‍🎓 Student: student@university.edu');
    console.log('─'.repeat(50));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}
seed();
