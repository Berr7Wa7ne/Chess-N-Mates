// middleware/auth.js — API key authentication for bot / jobs routes
const BOT_API_KEY = process.env.BOT_API_KEY;
const JOBS_API_KEY = process.env.JOBS_API_KEY;

/**
 * Middleware that validates a Bearer token on incoming requests.
 * Bot calls must include: Authorization: Bearer <BOT_API_KEY>
 * If no BOT_API_KEY is set, middleware passes through (dev mode).
 */
function validateBotApiKey(req, res, next) {
  // If no API key configured, allow through (dev/local mode)
  if (!BOT_API_KEY) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: { message: 'Missing Authorization header. Use: Bearer <BOT_API_KEY>' },
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: { message: 'Invalid Authorization format. Use: Bearer <BOT_API_KEY>' },
    });
  }

  const token = parts[1];
  if (token !== BOT_API_KEY) {
    return res.status(403).json({
      success: false,
      error: { message: 'Invalid API key' },
    });
  }

  next();
}

/**
 * Jobs key: x-jobs-key header OR Authorization: Bearer <JOBS_API_KEY>
 * Falls back to BOT_API_KEY if JOBS_API_KEY unset. Dev: no key → allow.
 */
function validateJobsApiKey(req, res, next) {
  const expected = JOBS_API_KEY || BOT_API_KEY;
  if (!expected) return next();

  const headerKey = req.headers['x-jobs-key'];
  if (headerKey && headerKey === expected) return next();

  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1] === expected) {
      return next();
    }
  }

  return res.status(401).json({
    success: false,
    error: { message: 'Unauthorized. Provide x-jobs-key or Authorization: Bearer <JOBS_API_KEY>' },
  });
}

module.exports = { validateBotApiKey, validateJobsApiKey };
