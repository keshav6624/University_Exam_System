const router = require('express').Router();
const ctrl = require('../controllers/teacherController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('teacher'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/courses', ctrl.getCourses);
router.post('/courses', ctrl.createCourse);
router.put('/courses/:id', ctrl.updateCourse);
router.get('/exams', ctrl.getExams);
router.get('/exams/:id', ctrl.getExam);
router.post('/exams', ctrl.createExam);
router.put('/exams/:id', ctrl.updateExam);
router.delete('/exams/:id', ctrl.deleteExam);
router.post('/exams/:examId/questions', ctrl.addQuestion);
router.put('/exams/:examId/questions/:qId', ctrl.updateQuestion);
router.delete('/exams/:examId/questions/:qId', ctrl.deleteQuestion);
router.get('/exams/:examId/submissions', ctrl.getSubmissions);
router.put('/submissions/:subId/grade', ctrl.gradeSubmission);
router.post('/exams/:examId/publish', ctrl.publishResults);
router.get('/exams/:examId/analytics', ctrl.getAnalytics);
router.get('/exams/:examId/reasoning-graph', ctrl.getReasoningGraph);
router.get('/exams/:examId/quality-radar', ctrl.getQuestionQualityRadar);
router.get('/exams/:examId/plagiarism-risk', ctrl.getPlagiarismStyleRisk);
router.get('/exams/:examId/workload-balance', ctrl.getWorkloadBalancer);
router.post('/exams/:examId/adaptive-viva/run', ctrl.runAdaptiveVivaTrigger);
router.post('/exams/:examId/equate', ctrl.equateExamScores);
router.get('/exams/:examId/digital-twin', ctrl.getDigitalTwin);

module.exports = router;
