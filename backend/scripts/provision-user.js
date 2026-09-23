#!/usr/bin/env node
/**
 * Controlled Backend Provisioning Script (Member 2 Scope)
 *
 * PROVISIONING TRUST MODEL:
 * - Grants application roles and restaurant scopes to Auth0 identities.
 * - Operates entirely backend-side; never exposed as a public HTTP endpoint.
 * - Does NOT import app.js, does not start Express server, and does not initialize notification services.
 * - Does NOT accept arbitrary caller-selected issuers; derives trusted issuer strictly
 *   from AUTH0_DOMAIN in the trusted environment.
 * - Validates all inputs before database writes.
 * - Supports --dry-run mode for safe preview.
 * - Respects the unique compound constraint (authIssuer + authSubject); aborts if user exists.
 * - Never prints the MONGODB_URI or sensitive credentials.
 */

require('dotenv').config();
const dns = require('node:dns');

// Configure reliable DNS servers to stabilize MongoDB Atlas SRV lookups on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Fall back to system DNS if setServers is unavailable
}

const mongoose = require('mongoose');
const User = require('../models/User');
const { getRestaurantNameById } = require('../utils/restaurantMapping');

function printUsage() {
  console.log(`
Usage:
  node scripts/provision-user.js --sub <auth0-subject> --role <customer|admin|mainAdmin> [--restaurant-id <id>] [--display-name <name>] [--dry-run]

Parameters:
  --sub, -s             (Required) Exact Auth0 user subject (e.g. auth0|66f1a..., google-oauth2|10...)
  --role, -r            (Required) Application role: 'customer', 'admin', or 'mainAdmin'
  --restaurant-id, -id  (Required for admin, forbidden for others) Canonical restaurant ID ("1" to "6")
  --display-name, -n    (Optional) Friendly display name
  --dry-run             (Optional) Validate inputs and preview record without modifying the database

Examples:
  # Dry-run customer:
  node scripts/provision-user.js --sub auth0|123456789 --role customer --display-name "John Doe" --dry-run

  # Provision Barista (Restaurant 1) admin:
  node scripts/provision-user.js --sub auth0|admin_barista_sub --role admin --restaurant-id 1 --display-name "Barista Admin"
`);
}

// Parse command line arguments
function parseArgs(args) {
  const parsed = {
    sub: null,
    role: null,
    restaurantId: null,
    displayName: null,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--sub' || arg === '-s') {
      parsed.sub = args[++i];
    } else if (arg.startsWith('--sub=')) {
      parsed.sub = arg.split('=')[1];
    } else if (arg === '--role' || arg === '-r') {
      parsed.role = args[++i];
    } else if (arg.startsWith('--role=')) {
      parsed.role = arg.split('=')[1];
    } else if (arg === '--restaurant-id' || arg === '--restaurantId' || arg === '-id') {
      parsed.restaurantId = args[++i];
    } else if (arg.startsWith('--restaurant-id=') || arg.startsWith('--restaurantId=')) {
      parsed.restaurantId = arg.split('=')[1];
    } else if (arg === '--display-name' || arg === '--displayName' || arg === '-n') {
      parsed.displayName = args[++i];
    } else if (arg.startsWith('--display-name=') || arg.startsWith('--displayName=')) {
      parsed.displayName = arg.split('=')[1];
    }
  }

  return parsed;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  // 1. Validate required environment configuration
  const domain = process.env.AUTH0_DOMAIN;
  if (!domain || !domain.trim()) {
    console.error('ERROR: AUTH0_DOMAIN environment variable is missing in backend environment.');
    process.exit(1);
  }

  // Derive trusted issuer URL strictly from environment configuration
  const trustedIssuer = domain.startsWith('http://') || domain.startsWith('https://')
    ? (domain.endsWith('/') ? domain : `${domain}/`)
    : `https://${domain}/`;

  // 2. Validate input parameters
  if (!args.sub || typeof args.sub !== 'string' || !args.sub.trim()) {
    console.error('ERROR: --sub (Auth0 subject identifier) is required.');
    printUsage();
    process.exit(1);
  }

  const normalizedSub = args.sub.trim();

  const validRoles = ['customer', 'admin', 'mainAdmin'];
  if (!args.role || !validRoles.includes(args.role.trim())) {
    console.error(`ERROR: --role must be one of: ${validRoles.join(', ')}.`);
    printUsage();
    process.exit(1);
  }

  const normalizedRole = args.role.trim();

  // Validate restaurantId requirements per role
  let normalizedRestaurantId = null;
  if (normalizedRole === 'admin') {
    if (!args.restaurantId || !String(args.restaurantId).trim()) {
      console.error("ERROR: --restaurant-id is required when role is 'admin'.");
      process.exit(1);
    }
    normalizedRestaurantId = String(args.restaurantId).trim();
    const mappedName = getRestaurantNameById(normalizedRestaurantId);
    if (!mappedName) {
      console.error(`ERROR: Unknown restaurant ID '${normalizedRestaurantId}'. Valid IDs are: 1 (Barista), 2 (Pizza Hut), 3 (Burger King), 4 (Coffee Bean), 5 (Ex Tea), 6 (Palm Strip Bar & Restaurant).`);
      process.exit(1);
    }
  } else {
    if (args.restaurantId) {
      console.error(`ERROR: --restaurant-id is only applicable to 'admin' role. Cannot assign restaurantId to role '${normalizedRole}'.`);
      process.exit(1);
    }
  }

  const normalizedDisplayName = args.displayName ? args.displayName.trim() : undefined;

  const plannedRecord = {
    authIssuer: trustedIssuer,
    authSubject: normalizedSub,
    role: normalizedRole,
    ...(normalizedRestaurantId ? { restaurantId: normalizedRestaurantId } : {}),
    ...(normalizedDisplayName ? { displayName: normalizedDisplayName } : {}),
    active: true,
  };

  // 3. Connect to database
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI environment variable is required.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
  } catch (err) {
    console.error('ERROR: Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  try {
    // 4. Check for existing record
    const existing = await User.findOne({
      authIssuer: trustedIssuer,
      authSubject: normalizedSub,
    });

    if (existing) {
      console.error(`ERROR: User record already exists for subject '${normalizedSub}' with issuer '${trustedIssuer}'.`);
      console.error(`Existing Profile ID: ${existing._id}, Role: ${existing.role}, RestaurantId: ${existing.restaurantId || 'none'}, Active: ${existing.active}`);
      console.error('Provisioning aborted. Existing roles and restaurant assignments are never silently overwritten.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Ensure database indexes exist
    await User.init();

    // 5. Dry run or write
    if (args.dryRun) {
      console.log('\n================== DRY RUN MODE ==================');
      console.log('Validation passed successfully. No database write performed.');
      console.log('Planned User Profile:');
      console.log(JSON.stringify(plannedRecord, null, 2));
      console.log('==================================================\n');
    } else {
      const createdUser = await User.create(plannedRecord);
      console.log('\n================ PROVISION SUCCESS ================');
      console.log(`Internal ID   : ${createdUser._id}`);
      console.log(`Auth Subject  : ${createdUser.authSubject}`);
      console.log(`Role          : ${createdUser.role}`);
      if (createdUser.restaurantId) {
        console.log(`Restaurant ID : ${createdUser.restaurantId} (${getRestaurantNameById(createdUser.restaurantId)})`);
      }
      if (createdUser.displayName) {
        console.log(`Display Name  : ${createdUser.displayName}`);
      }
      console.log(`Active        : ${createdUser.active}`);
      console.log('===================================================\n');
    }
  } catch (err) {
    console.error('ERROR: Provisioning failed during execution:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Unhandled script error:', err);
    process.exit(1);
  });
}

module.exports = { parseArgs };
