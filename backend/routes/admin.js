const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') cb(null, true);
    else cb(new Error('Only CSV files allowed'));
  }
});

router.use(authenticate, authorize('admin'));

router.get('/dashboard', ctrl.getDashboard);

router.get('/departments', ctrl.getDepartments);
router.post('/departments', ctrl.createDepartment);
router.put('/departments/:id', ctrl.updateDepartment);
router.delete('/departments/:id', ctrl.deleteDepartment);

router.get('/teachers', ctrl.getTeachers);
router.post('/teachers', ctrl.createTeacher);
router.put('/teachers/:id', ctrl.updateTeacher);

router.get('/students', ctrl.getStudents);
router.post('/students', ctrl.createStudent);
router.post('/students/bulk', upload.single('file'), ctrl.bulkUploadStudents);

router.put('/users/:id/status', ctrl.updateUserStatus);
router.get('/logs', ctrl.getLogs);
router.get('/courses', ctrl.getCourses);
router.post('/courses/assign', ctrl.assignCourse);
router.get('/audit/disputes/:submissionId', ctrl.getDisputeAudit);

module.exports = router;
