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

module.exports = { requireAuth };
