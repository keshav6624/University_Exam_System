/**
 * System Logger Utility
 * Logs user actions to system_logs table
 */
const { query } = require('../config/database');

/**
 * Log a system action
 * @param {Object} params
 * @param {number} params.userId - User performing action
 * @param {string} params.action - Action description (e.g., 'CREATE_EXAM')
 * @param {string} params.entityType - Entity type (e.g., 'exam', 'user')
 * @param {number} params.entityId - Entity ID
 * @param {Object} params.details - Additional details (stored as JSONB)
 * @param {string} params.ipAddress - IP address of request
 */
const logAction = async ({ userId, action, entityType, entityId, details, ipAddress }) => {
  try {
    await query(
      `INSERT INTO system_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, action, entityType || null, entityId || null,
       details ? JSON.stringify(details) : null, ipAddress || null]
    );
  } catch (err) {
    // Non-critical: don't throw, just log to console
    console.error('Logger error:', err.message);
  }
};

module.exports = { logAction };
