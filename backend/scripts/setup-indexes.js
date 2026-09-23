#!/usr/bin/env node
/**
 * Setup Database Indexes Script
 *
 * Explicitly initializes and validates database indexes on the User collection:
 * - Compound unique index on { authIssuer: 1, authSubject: 1 }
 *
 * Usage:
 *   node scripts/setup-indexes.js
 */

require('dotenv').config();
const dns = require('node:dns');

// Configure reliable DNS servers to stabilize MongoDB Atlas SRV lookups on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Fall back to system DNS
}

const mongoose = require('mongoose');
const User = require('../models/User');

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI environment variable is required.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);

    console.log('Building/validating indexes for User collection...');
    await User.init();

    const indexes = await User.collection.indexes();
    console.log('Active User indexes:');
    indexes.forEach((idx) => {
      console.log(` - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${Boolean(idx.unique)})`);
    });

    console.log('Indexes successfully established and verified.');
  } catch (err) {
    console.error('ERROR: Failed establishing indexes:', err.message);
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
