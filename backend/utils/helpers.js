/**
 * Utility Helper Functions
 */

/**
 * Build pagination metadata
 */
const paginate = (page = 1, limit = 10) => {
  const p = Math.max(1, parseInt(page));
  const l = Math.min(100, Math.max(1, parseInt(limit)));
  return { page: p, limit: l, offset: (p - 1) * l };
};

/**
 * Build pagination response
 */
const paginationMeta = (total, page, limit) => ({
  total: parseInt(total),
  page: parseInt(page),
  limit: parseInt(limit),
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

/**
 * Calculate grade based on percentage
 */
const calculateGrade = (percentage) => {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
};

/**
 * Get client IP address from request
 */
const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
};

/**
 * Create a safe error response
 */
const errorResponse = (res, status, message, errors = null) => {
  const response = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(status).json(response);
};

/**
 * Create a success response
 */
const successResponse = (res, data, message = 'Success', status = 200) => {
  return res.status(status).json({ success: true, message, ...data });
};

module.exports = { paginate, paginationMeta, calculateGrade, getClientIp, errorResponse, successResponse };
