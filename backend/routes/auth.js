const router = require('express').Router();
const { login, getMe, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');

router.post('/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate, login
);
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate,
  [body('current_password').notEmpty(), body('new_password').isLength({ min: 8 })],
  validate, changePassword
);

module.exports = router;
