import axios from 'axios';
import toast from 'react-hot-toast';

const getApiBaseUrl = () => {
  const envBase =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)?.trim() ||
    process.env.REACT_APP_API_URL?.trim();
  if (!envBase) return '/api';
  return /\/api\/?$/i.test(envBase) ? envBase : `${envBase.replace(/\/$/, '')}/api`;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg = error.response?.data?.message || 'Something went wrong';
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }
    if (error.response?.status !== 404) {
      toast.error(msg);
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Admin
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getDepts: (params) => api.get('/admin/departments', { params }),
  createDept: (data) => api.post('/admin/departments', data),
  updateDept: (id, data) => api.put(`/admin/departments/${id}`, data),
  deleteDept: (id) => api.delete(`/admin/departments/${id}`),
  getTeachers: (params) => api.get('/admin/teachers', { params }),
  createTeacher: (data) => api.post('/admin/teachers', data),
  updateTeacher: (id, data) => api.put(`/admin/teachers/${id}`, data),
  getStudents: (params) => api.get('/admin/students', { params }),
  createStudent: (data) => api.post('/admin/students', data),
  bulkUploadStudents: (formData) => api.post('/admin/students/bulk', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateUserStatus: (id, status) => api.put(`/admin/users/${id}/status`, { status }),
  getLogs: (params) => api.get('/admin/logs', { params }),
  getCourses: (params) => api.get('/admin/courses', { params }),
  assignCourse: (data) => api.post('/admin/courses/assign', data),
};

// Teacher
export const teacherAPI = {
  getDashboard: () => api.get('/teacher/dashboard'),
  getCourses: (params) => api.get('/teacher/courses', { params }),
  createCourse: (data) => api.post('/teacher/courses', data),
  updateCourse: (id, data) => api.put(`/teacher/courses/${id}`, data),
  getExams: (params) => api.get('/teacher/exams', { params }),
  getExam: (id) => api.get(`/teacher/exams/${id}`),
  createExam: (data) => api.post('/teacher/exams', data),
  updateExam: (id, data) => api.put(`/teacher/exams/${id}`, data),
  deleteExam: (id) => api.delete(`/teacher/exams/${id}`),
  addQuestion: (examId, data) => api.post(`/teacher/exams/${examId}/questions`, data),
  updateQuestion: (examId, qId, data) => api.put(`/teacher/exams/${examId}/questions/${qId}`, data),
  deleteQuestion: (examId, qId) => api.delete(`/teacher/exams/${examId}/questions/${qId}`),
  getSubmissions: (examId, params) => api.get(`/teacher/exams/${examId}/submissions`, { params }),
  gradeSubmission: (subId, data) => api.put(`/teacher/submissions/${subId}/grade`, data),
  publishResults: (examId) => api.post(`/teacher/exams/${examId}/publish`),
  getAnalytics: (examId) => api.get(`/teacher/exams/${examId}/analytics`),
};

// Student
export const studentAPI = {
  getDashboard: () => api.get('/student/dashboard'),
  getCourses: () => api.get('/student/courses'),
  getExams: (params) => api.get('/student/exams', { params }),
  getExam: (id) => api.get(`/student/exams/${id}`),
  startExam: (id) => api.post(`/student/exams/${id}/start`),
  submitExam: (id, data) => api.post(`/student/exams/${id}/submit`, data),
  getResults: (params) => api.get('/student/results', { params }),
  getResult: (id) => api.get(`/student/results/${id}`),
};
