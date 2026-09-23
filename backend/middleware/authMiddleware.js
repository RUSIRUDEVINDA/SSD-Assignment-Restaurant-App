const { auth } = require("express-oauth2-jwt-bearer");

/**
 * Server-Side Authentication Middleware (Member 1 Scope)
 *
 * Verifies JWT access tokens issued by Auth0 using the JWKS endpoint.
 * Ensures the caller is cryptographically authenticated before invoking controllers.
 *
 * Note: Authentication only verifies caller identity ("Who is the caller?").
 * Authorization, role enforcement, and resource ownership checks remain Member 2 scope.
 */
const domain = process.env.AUTH0_DOMAIN;
const audience = process.env.AUTH0_AUDIENCE;

if (!domain || !audience) {
  throw new Error(
    "Auth0 authentication configuration is missing. AUTH0_DOMAIN and AUTH0_AUDIENCE are required."
  );
}

const issuerBaseURL = domain.startsWith("http://") || domain.startsWith("https://")
  ? (domain.endsWith("/") ? domain : `${domain}/`)
  : `https://${domain}/`;

const requireAuth = auth({
  audience,
  issuerBaseURL,
  tokenSigningAlg: "RS256",
});

/**
 * Authentication Error Handler Middleware
 *
 * Catches JWT/OAuth2 authentication errors from express-oauth2-jwt-bearer,
 * logs detailed diagnostic information to the server logs for auditing/debugging,
 * and returns a sanitized, generic JSON 401 response without leaking internal error details.
 */
const authErrorHandler = (err, req, res, next) => {
  if (
    err.name === "UnauthorizedError" ||
    err.name === "InvalidTokenError" ||
    err.status === 401 ||
    err.statusCode === 401
  ) {
    console.error(`[Authentication Error] ${req.method} ${req.originalUrl || req.url}:`, {
      name: err.name,
      code: err.code,
      message: err.message,
      headers: err.headers,
      stack: err.stack,
    });

    if (err.headers) {
      res.set(err.headers);
    }

    return res.status(401).json({
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  next(err);
};

module.exports = { requireAuth, authErrorHandler };
