// Test-only boundary doubles. Never imported by production app.js.
const path = require('node:path');
const Module = require('node:module');

async function createFixture(backendRoot = path.resolve(__dirname, '../..')) {
  const dependencyRoot = path.resolve(__dirname, '../../node_modules');
  process.env.NODE_PATH = dependencyRoot;
  Module._initPaths();
  const rootRequire = Module.createRequire(path.join(backendRoot, 'app.js'));
  const nodemailer = rootRequire('nodemailer');
  const dotenv = rootRequire('dotenv');
  // Ignore local credentials and block external integrations in this isolated process.
  dotenv.config = () => ({ parsed: {} });
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  const emails = [];
  let writes = 0;
  nodemailer.createTransport = () => ({ sendMail: async mail => {
    emails.push(mail);
    return { messageId: `captured-${emails.length}` };
  } });
  const mongoose = rootRequire('mongoose');
  mongoose.connect = () => { throw new Error('Network database access is disabled in this fixture'); };
  const Order = rootRequire('./models/restaurantOrderModel');
  const Reservation = rootRequire('./models/reservationModel');
  Order.create = async data => {
    const doc = new Order(data);
    await doc.validate();
    writes++;
    return doc;
  };
  Reservation.prototype.save = async function () {
    await this.validate();
    writes++;
    return this;
  };
  const appPath = path.join(backendRoot, 'app.js');
  let app;
  const source = require('node:fs').readFileSync(appPath, 'utf8');
  if (source.includes('module.exports = { createApp }')) {
    app = rootRequire('./app').createApp();
  } else {
    // Load the unmodified baseline app, replacing only startup side effects.
    const express = rootRequire('express');
    const realListen = express.application.listen;
    const realConnect = mongoose.connect;
    process.env.MONGODB_URI = 'mongodb://127.0.0.1/disabled-test-only';
    mongoose.connect = async () => mongoose;
    express.application.listen = function () { app = this; };
    try {
      rootRequire('./app');
      await new Promise(resolve => setImmediate(resolve));
    } finally {
      mongoose.connect = realConnect;
      express.application.listen = realListen;
      if (app) app.listen = realListen;
    }
  }
  if (!app) throw new Error('Fixture did not capture the application');
  return { app, emails, get writes() { return writes; }, rootRequire };
}

const orderPayload = {
  restaurantName: 'Barista',
  itemsPurchased: [{ name: 'Coffee', quantity: 1, price: 450 }],
  totalAmount: 450,
  fullName: '<b>SECURITY_TEST</b>',
  email: 'member4@example.invalid',
  phoneNumber: '0770000000',
  pickupTime: '12:00'
};
const reservationPayload = {
  restaurantName: 'Barista', customerName: '<b>SECURITY_TEST</b>',
  customerEmail: 'member4@example.invalid', customerPhone: '0770000000',
  date: '2026-10-01', time: '12:00', partySize: 2
};
module.exports = { createFixture, orderPayload, reservationPayload };
