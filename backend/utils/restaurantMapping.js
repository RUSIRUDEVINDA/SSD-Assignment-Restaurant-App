/**
 * Authoritative Server-Side Restaurant Identity & Scope Mapping
 * 
 * Maps stable restaurant identifiers to authoritative restaurant names.
 * Ensures scope checks do not rely on untrusted client parameters or fuzzy matching.
 */

const RESTAURANT_DIRECTORY = Object.freeze([
  { id: "1", name: "Barista" },
  { id: "2", name: "Pizza Hut" },
  { id: "3", name: "Burger King" },
  { id: "4", name: "Coffee Bean" },
  { id: "5", name: "Ex Tea" },
  { id: "6", name: "Palm Strip Bar & Restaurant" }
]);

// Fast lookup maps
const idToNameMap = new Map(RESTAURANT_DIRECTORY.map(r => [String(r.id), r.name]));
const nameToIdMap = new Map(RESTAURANT_DIRECTORY.map(r => [r.name.toLowerCase(), String(r.id)]));

/**
 * Resolves an authoritative restaurant name given a trusted restaurant ID.
 * @param {string|number} restaurantId
 * @returns {string|null} Canonical restaurant name or null if unmapped
 */
function getRestaurantNameById(restaurantId) {
  if (restaurantId === null || restaurantId === undefined) return null;
  const strId = String(restaurantId).trim();
  if (!strId) return null;
  return idToNameMap.get(strId) || null;
}

/**
 * Resolves an authoritative restaurant ID given a restaurant name.
 * @param {string} restaurantName
 * @returns {string|null} Canonical restaurant ID or null if unmapped
 */
function getRestaurantIdByName(restaurantName) {
  if (typeof restaurantName !== 'string' || !restaurantName.trim()) return null;
  return nameToIdMap.get(restaurantName.trim().toLowerCase()) || null;
}

/**
 * Validates whether a user identity has authorization for a specific restaurant.
 * Requires usable, valid target restaurant information.
 * Rejects missing, malformed, unknown, and contradictory target scope.
 * 
 * @param {object} user - The req.user identity object
 * @param {object} scope - Target restaurant scope { restaurantId, restaurantName }
 * @returns {boolean} true if authorized, false otherwise
 */
function isUserInRestaurantScope(user, scope = {}) {
  // 1. Validate trusted identity according to documented contract
  if (!user || typeof user !== 'object') return false;
  if (typeof user.id !== 'string' || !user.id.trim()) return false;
  if (!['customer', 'admin', 'mainAdmin'].includes(user.role)) return false;

  // Customers are denied all administrative operations
  if (user.role === 'customer') {
    return false;
  }

  // 2. Validate target scope
  if (!scope || typeof scope !== 'object') return false;

  let targetIdFromId = null;
  let targetIdFromName = null;

  const hasId = scope.restaurantId !== undefined && scope.restaurantId !== null && String(scope.restaurantId).trim() !== '';
  const hasName = typeof scope.restaurantName === 'string' && scope.restaurantName.trim() !== '';

  // Target scope must provide at least one usable identifier
  if (!hasId && !hasName) {
    return false;
  }

  if (hasId) {
    const rawId = String(scope.restaurantId).trim();
    const nameMatch = getRestaurantNameById(rawId);
    if (!nameMatch) {
      // Unknown or malformed restaurant ID
      return false;
    }
    targetIdFromId = rawId;
  }

  if (hasName) {
    const idMatch = getRestaurantIdByName(scope.restaurantName);
    if (!idMatch) {
      // Unknown or malformed restaurant name
      return false;
    }
    targetIdFromName = idMatch;
  }

  // If both ID and Name are provided, they must agree authoritatively (no contradiction)
  if (targetIdFromId && targetIdFromName && targetIdFromId !== targetIdFromName) {
    return false;
  }

  const canonicalTargetId = targetIdFromId || targetIdFromName;

  // 3. Permission checks against validated canonical target restaurant
  // mainAdmin is authorized across all valid restaurants
  if (user.role === 'mainAdmin') {
    return true;
  }

  // Restaurant admin must have a valid assigned restaurantId matching the target
  if (user.role === 'admin') {
    if (!user.restaurantId) return false;
    const userRestaurantId = String(user.restaurantId).trim();
    if (!getRestaurantNameById(userRestaurantId)) {
      // Unassigned or unrecognized admin restaurant assignment
      return false;
    }

    return userRestaurantId === canonicalTargetId;
  }

  return false;
}

module.exports = {
  RESTAURANT_DIRECTORY,
  getRestaurantNameById,
  getRestaurantIdByName,
  isUserInRestaurantScope
};
