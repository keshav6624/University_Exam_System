const router = require('express').Router();
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { sendMessage } = require('../controllers/chatbotController');

router.post(
  '/message',
  authenticate,
  [
    body('message').isString().trim().notEmpty().withMessage('Message is required'),
    body('history').optional().isArray(),
  ],
  validate,
  sendMessage
);

module.exports = router;