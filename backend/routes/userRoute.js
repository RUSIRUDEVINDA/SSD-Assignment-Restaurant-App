const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { loadUserIdentity } = require('../middleware/loadUserIdentity');

/**
 * GET /api/me
 *
 * Protected endpoint returning only the caller's authoritative application profile.
 * Executes: requireAuth -> loadUserIdentity.
 *
 * Returns:
 * - id: Stable internal application user ID (MongoDB _id string, distinct from Auth0 sub)
 * - role: 'customer' | 'admin' | 'mainAdmin'
 * - restaurantId: Canonical restaurant ID (only when applicable to restaurant admin)
 * - displayName: Display name if present
 */
router.get('/me', requireAuth, loadUserIdentity, (req, res) => {
  const profile = {
    id: req.user.id,
    role: req.user.role,
  };

  if (req.user.restaurantId) {
    profile.restaurantId = req.user.restaurantId;
  }

  if (req.user.displayName) {
    profile.displayName = req.user.displayName;
  }

  return res.json(profile);
});

module.exports = router;
