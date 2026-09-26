const { rateLimit } = require('express-rate-limit');

// Separate stores are created for each app. Direct connections only: do not trust
// client-supplied X-Forwarded-For. Configure trusted proxies explicitly at deployment.
function createResourceProtection() {
  const options = {
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too Many Requests', message: 'Request limit reached. Try again later.' }
  };
  return {
    apiLimiter: rateLimit({ ...options, windowMs: 15 * 60 * 1000, limit: 100 }),
    writeLimiter: rateLimit({
      ...options,
      windowMs: 60 * 1000,
      limit: 10,
      skip: req => ['GET', 'HEAD', 'OPTIONS'].includes(req.method)
    })
  };
}

// Bound the amount of work within a single accepted request as well as its bytes.
function validateResourceBounds(req, res, next) {
  const pending = [req.body];
  let nodes = 0;
  while (pending.length) {
    const value = pending.pop();
    if (++nodes > 1000 || (typeof value === 'string' && value.length > 2000) ||
        (Array.isArray(value) && value.length > 50)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Request exceeds field, array, or structure limits.' });
    }
    if (value && typeof value === 'object') pending.push(...Object.values(value));
  }
  next();
}

function resourceErrorHandler(err, req, res, next) {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Payload Too Large', message: 'JSON body must not exceed 32 KB.' });
  }
  if (err.type === 'encoding.unsupported') {
    return res.status(415).json({ error: 'Unsupported Media Type', message: 'Compressed request bodies are not supported.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid JSON body.' });
  }
  next(err);
}

module.exports = { createResourceProtection, validateResourceBounds, resourceErrorHandler };
