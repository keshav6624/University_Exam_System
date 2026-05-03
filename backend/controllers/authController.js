/**
 * Authentication Controller
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { logAction } = require('../utils/logger');
const { getClientIp } = require('../utils/helpers');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await query(
      `SELECT u.*, d.name AS department_name 
       FROM users u LEFT JOIN departments d ON d.id = u.department_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const user = result.rows[0];
    if (user.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Account suspended. Contact admin.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    await logAction({ userId: user.id, action: 'LOGIN', entityType: 'user', entityId: user.id, details: { role: user.role }, ipAddress: getClientIp(req) });
    const { password: _, ...userData } = user;
    res.json({ success: true, message: 'Login successful', token, user: userData });
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.status, u.student_id, u.employee_id,
              u.phone, u.last_login, u.created_at, d.name AS department_name, d.id AS department_id
       FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) { next(err); }
};

const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const result = await query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(current_password, result.rows[0].password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    if (new_password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    const hashed = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    await logAction({ userId: req.user.id, action: 'CHANGE_PASSWORD', entityType: 'user', entityId: req.user.id, ipAddress: getClientIp(req) });
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) { next(err); }
};

module.exports = { login, getMe, changePassword };
