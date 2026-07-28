// middleware/auth.js — API key authentication for bot routes
const BOT_API_KEY = process.env.BOT_API_KEY;

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

module.exports = { validateBotApiKey };