/**
 * Centralized Application Error Handling Middleware (V04 Remediation)
 *
 * Catches unhandled application errors, malformed JSON body-parser errors,
 * and unexpected exceptions. Logs full diagnostic information server-side
 * while preventing stack traces, filesystem paths, or internal driver/schema
 * internals from being disclosed to clients.
 */

const errorHandler = (err, req, res, next) => {
  // Always log detailed server-side error diagnostic
  console.error(`[Unhandled Error] ${req.method} ${req.originalUrl || req.url}:`, err);

  // If response headers have already been committed, delegate to default handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle malformed JSON payload from express.json() / body-parser
  if (
    (err instanceof SyntaxError || err.type === 'entity.parse.failed') &&
    (err.status === 400 || err.statusCode === 400)
  ) {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  // Handle Mongoose CastError (e.g. malformed ObjectId) reaching central handler
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  // Default unexpected server errors: generic 500 without leaking stack or internal details
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({ error: 'Internal server error' });
};

module.exports = { errorHandler };