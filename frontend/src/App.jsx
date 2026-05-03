import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// Auth
import Login from './pages/auth/Login';

// Student
import StudentDashboard from './pages/student/StudentDashboard';
import StudentCourses from './pages/student/StudentCourses';
import StudentExams from './pages/student/StudentExams';
import StudentResults from './pages/student/StudentResults';
import ResultDetail from './pages/student/ResultDetail';
import ExamAttempt from './pages/student/ExamAttempt';

// Teacher
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherCourses from './pages/teacher/TeacherCourses';
import TeacherExams from './pages/teacher/TeacherExams';
import ExamEditor from './pages/teacher/ExamEditor';
import TeacherGrading from './pages/teacher/TeacherGrading';
import TeacherAnalytics from './pages/teacher/TeacherAnalytics';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminTeachers from './pages/admin/AdminTeachers';
import AdminStudents from './pages/admin/AdminStudents';
import AdminCourses from './pages/admin/AdminCourses';
import AdminLogs from './pages/admin/AdminLogs';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Student Routes */}
            <Route element={<ProtectedRoute roles={['student']} />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/courses" element={<StudentCourses />} />
              <Route path="/student/exams" element={<StudentExams />} />
              <Route path="/student/results" element={<StudentResults />} />
              <Route path="/student/results/:id" element={<ResultDetail />} />
            </Route>

            {/* Exam attempt - full screen, no sidebar */}
            <Route path="/student/exam/:id" element={<ExamAttempt />} />

            {/* Teacher Routes */}
            <Route element={<ProtectedRoute roles={['teacher']} />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/courses" element={<TeacherCourses />} />
              <Route path="/teacher/exams" element={<TeacherExams />} />
              <Route path="/teacher/exams/new" element={<ExamEditor />} />
              <Route path="/teacher/exams/:id/edit" element={<ExamEditor />} />
              <Route path="/teacher/grading" element={<TeacherGrading />} />
              <Route path="/teacher/analytics" element={<TeacherAnalytics />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/departments" element={<AdminDepartments />} />
              <Route path="/admin/teachers" element={<AdminTeachers />} />
              <Route path="/admin/students" element={<AdminStudents />} />
              <Route path="/admin/courses" element={<AdminCourses />} />
              <Route path="/admin/logs" element={<AdminLogs />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
        <Toaster position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}
