/**
 * Member 2: Load User Identity Middleware
 *
 * TRUST CHAIN & INTEGRATION CONTRACT:
 * This middleware relies strictly on upstream `requireAuth` (implemented via express-oauth2-jwt-bearer).
 * Checking that `req.auth` exists alone is NOT cryptographic verification; `requireAuth` MUST run first
 * to cryptographically verify the token signature, issuer, audience, and expiration against Auth0's JWKS.
 *
 * This middleware maps the cryptographically verified token claims (`iss` and `sub`) to a trusted,
 * provisioned internal database User record, establishing the authoritative `req.user` context:
 *
 * req.user = {
 *   id: string,                 // Stable internal MongoDB ObjectId string (distinct from Auth0 sub)
 *   role: "customer" | "admin" | "mainAdmin",
 *   restaurantId?: string       // Trusted assigned restaurant ID (required for 'admin')
 *   displayName?: string        // Optional display name
 * }
 *
 * ZERO CLIENT TRUST:
 * - Does NOT decode unverified tokens.
 * - Does NOT trust role, restaurant, or identity fields supplied in client headers, bodies, queries, or frontend state.
 * - Does NOT match admin accounts using email addresses or frontend lists.
 * - Does NOT fall back to fake, demo, or default identities.
 * - Does NOT automatically promote unprovisioned users.
 * - Does NOT log tokens or sensitive secrets.
 */

const User = require('../models/User');
const { getRestaurantNameById } = require('../utils/restaurantMapping');
const { VALID_ROLES } = require('./authorization');

const loadUserIdentity = async (req, res, next) => {
  // 1. Enforce prerequisite: verified authentication context from upstream requireAuth
  if (!req.auth || !req.auth.payload || typeof req.auth.payload !== 'object') {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required: verified authentication context absent.',
    });
  }

  // 2. Extract and validate issuer and subject claims
  const { iss, sub } = req.auth.payload;

  if (typeof iss !== 'string' || !iss.trim() || typeof sub !== 'string' || !sub.trim()) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required: verified token claims are missing or malformed.',
    });
  }

  const normalizedIssuer = iss.trim();
  const normalizedSubject = sub.trim();

  // 3. Look up provisioned internal user by exact issuer/subject pair
  let user;
  try {
    user = await User.findOne({
      authIssuer: normalizedIssuer,
      authSubject: normalizedSubject,
    });
  } catch (err) {
    // Pass database errors to server error handling; do NOT disguise DB failure as auth failure
    console.error('[loadUserIdentity] Database query failure:', err.message);
    return next(err);
  }

  // 4. Reject unprovisioned accounts with HTTP 403 Forbidden
  if (!user) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: account not provisioned.',
    });
  }

  // 5. Reject inactive accounts with HTTP 403 Forbidden
  if (!user.active) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: account is inactive.',
    });
  }

  // 6. Validate stored role and restaurant assignment
  const role = user.role;
  if (!VALID_ROLES.includes(role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: unrecognized user role in profile.',
    });
  }

  // Restaurant admin must have a valid authoritative restaurant assignment
  if (role === 'admin') {
    if (!user.restaurantId || !getRestaurantNameById(String(user.restaurantId).trim())) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: restaurant administrator has no valid assigned restaurant.',
      });
    }
  }

  // 7. Establish trusted req.user context using internal MongoDB identifier
  req.user = {
    id: user._id.toString(),
    role: user.role,
    ...(user.restaurantId ? { restaurantId: String(user.restaurantId).trim() } : {}),
    ...(user.displayName ? { displayName: user.displayName } : {}),
  };

  next();
};

module.exports = { loadUserIdentity };
