const router = require('express').Router();
const ctrl = require('../controllers/studentController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('student'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/courses', ctrl.getCourses);
router.get('/exams', ctrl.getExams);
router.get('/exams/:id', ctrl.getExam);
router.post('/exams/:id/start', ctrl.startExam);
router.post('/exams/:id/autosave', ctrl.autosaveExam);
router.post('/exams/:id/submit', ctrl.submitExam);
router.get('/results', ctrl.getResults);
router.get('/results/:id', ctrl.getResult);
router.get('/results/:id/dispute-pack', ctrl.getDisputePack);
router.get('/transcript', ctrl.getSkillTranscript);

module.exports = router;
