/**
 * Member 2: Authorization & Scope Verification Middleware (V03)
 * 
 * INTEGRATION CONTRACT:
 * Upstream authentication (managed by Member 1 via OAuth/OIDC or sessions)
 * is expected to verify identity and populate the request context:
 * 
 * req.user = {
 *   id: string,                 // Stable internal user identifier
 *   role: "customer" | "admin" | "mainAdmin",
 *   restaurantId?: string       // Trusted assigned restaurant ID (required for 'admin')
 * }
 * 
 * NOTE: These middleware functions are authorization guards. They verify
 * permissions and scope on an established identity. They DO NOT extract identity
 * from untrusted client headers, query parameters, or request bodies.
 */

const { isUserInRestaurantScope, getRestaurantNameById } = require('../utils/restaurantMapping');

const VALID_ROLES = Object.freeze(['customer', 'admin', 'mainAdmin']);

/**
 * Helper to validate user identity against documented contract:
 * req.user = { id: string (non-empty), role: string, restaurantId?: string }
 */
function isValidIdentity(user) {
  if (!user || typeof user !== 'object') return false;
  if (typeof user.id !== 'string' || !user.id.trim()) return false;
  if (typeof user.role !== 'string' || !user.role.trim()) return false;
  return true;
}

/**
 * Authorization Prerequisite Guard
 * Enforces that an authenticated identity has been established upstream.
 */
function requireAuthenticatedUser(req, res, next) {
  if (!isValidIdentity(req.user)) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required: no verified user identity present.'
    });
  }

  if (!VALID_ROLES.includes(req.user.role)) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied: unrecognized user role.'
    });
  }

  next();
}

/**
 * Role-Based Access Control (RBAC) Guard
 * Restricts access to callers holding at least one of the specified roles.
 * @param  {...string} allowedRoles
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Ensure identity prerequisite
    if (!isValidIdentity(req.user)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required: no verified user identity present.'
      });
    }

    if (!VALID_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: unrecognized user role.'
      });
    }

    // Role check
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied: role '${req.user.role}' lacks permission for this operation.`
      });
    }

    // Restaurant admin must have a valid, mapped restaurant assignment
    if (req.user.role === 'admin') {
      if (!req.user.restaurantId || !getRestaurantNameById(req.user.restaurantId)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: restaurant administrator has no valid assigned restaurant.'
        });
      }
    }

    next();
  };
}

/**
 * Tenant Scope Guard by URL Parameter 'restaurantName'
 * Ensures restaurant admins can only query data matching their assigned restaurant name.
 * @param {string} paramName - Route parameter name (default: 'restaurantName')
 */
function requireRestaurantScopeByName(paramName = 'restaurantName') {
  return (req, res, next) => {
    if (!req.user || !req.user.id || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    const targetName = req.params[paramName];
    if (!targetName) {
      return res.status(400).json({ error: 'Bad Request', message: `Missing required parameter: ${paramName}` });
    }

    const inScope = isUserInRestaurantScope(req.user, { restaurantName: targetName });
    if (!inScope) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied: user is not authorized for restaurant '${targetName}'.`
      });
    }

    next();
  };
}

/**
 * Tenant Scope Guard by URL Parameter 'restaurantId'
 * Ensures restaurant admins can only query data matching their assigned restaurant ID.
 * @param {string} paramName - Route parameter name (default: 'restaurantId')
 */
function requireRestaurantScopeById(paramName = 'restaurantId') {
  return (req, res, next) => {
    if (!req.user || !req.user.id || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
    }

    const targetId = req.params[paramName];
    if (!targetId) {
      return res.status(400).json({ error: 'Bad Request', message: `Missing required parameter: ${paramName}` });
    }

    const inScope = isUserInRestaurantScope(req.user, { restaurantId: targetId });
    if (!inScope) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Access denied: user is not authorized for restaurant ID '${targetId}'.`
      });
    }

    next();
  };
}

module.exports = {
  VALID_ROLES,
  requireAuthenticatedUser,
  requireRole,
  requireRestaurantScopeByName,
  requireRestaurantScopeById
};
