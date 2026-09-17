const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send a confirmation email for an order
 * @param {string} to - Recipient email address
 * @param {object} order - Order object
 * @returns {Promise}
 */
async function sendOrderConfirmation(to, order) {
  const restaurantName = order.restaurantName || 'Our Restaurant';
  const fullName = order.fullName || order.customerName || 'Customer';
  const orderId = order._id || 'N/A';
  // Use order.createdAt (order time) for 'Time' field
  const orderTime = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }) : 'N/A';
  const pickupTime = order.pickupTime || 'N/A';
  const totalAmount = typeof order.totalAmount === 'number' ? order.totalAmount.toFixed(2) : (order.totalAmount || 'N/A');
  let itemsHtml = '';
  if (Array.isArray(order.itemsPurchased) && order.itemsPurchased.length > 0) {
    itemsHtml = `<tr><td colspan='2' style='padding-top:8px;'><b>Items:</b></td></tr>` +
      order.itemsPurchased.map(item =>
        `<tr><td style='padding-left:16px;'>${item.name || 'Item'} x${item.quantity || 1}</td><td>Rs. ${(item.price * item.quantity).toFixed(2)}</td></tr>`
      ).join('');
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Order Confirmation - ${restaurantName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; padding: 24px; border-radius: 12px; max-width: 480px; margin: auto;">
        <div style="text-align:center; margin-bottom: 24px;">
          
          <h1 style="color:#1a237e;margin:0;font-size:1.6em;">Order Confirmed!</h1>
        </div>
        <p style="font-size:1.1em;">Hello <strong>${fullName}</strong>,</p>
        <p>Your order from <span style="font-weight:600; color:#0078d7">${restaurantName}</span> has been confirmed.</p>
        <table style="width:100%;background:#fff;border-radius:8px;padding:16px 8px;margin:16px 0;box-shadow:0 2px 8px #eee;font-size:1em;">
          <tr><td><b>Order ID:</b></td><td>${orderId}</td></tr>
          <tr><td><b>Pickup Time:</b></td><td>${pickupTime}</td></tr>
          <tr><td><b>Total Amount:</b></td><td>Rs. ${totalAmount}</td></tr>
          ${itemsHtml}
        </table>
        <p style="color:#555;">Thank you for choosing AeroX Dinings!<br>We look forward to serving you.</p>
        <div style="margin-top:24px;text-align:center;">
          <small style="color:#aaa;">&copy; ${new Date().getFullYear()} AeroX Dinings</small>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
}

/**
 * Send a confirmation email for a reservation
 * @param {string} to - Recipient email address
 * @param {object} reservation - Reservation object
 * @returns {Promise}
 */
async function sendReservationConfirmation(to, reservation) {
  const restaurantName = reservation.restaurantName || 'Our Restaurant';
  const fullName = reservation.customerName || reservation.fullName || 'Guest';
  const reservationId = reservation._id || 'N/A';
  const date = reservation.date ? new Date(reservation.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full' }) : 'N/A';
  const time = reservation.time || 'N/A';
  const guests = reservation.partySize || reservation.guests || 'N/A';

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: `Reservation Confirmation - ${restaurantName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9f9f9; padding: 24px; border-radius: 12px; max-width: 480px; margin: auto;">
        <div style="text-align:center; margin-bottom: 24px;">
          
          <h1 style="color:#1a237e;margin:0;font-size:1.6em;">Reservation Confirmed!</h1>
        </div>
        <p style="font-size:1.1em;">Hello <strong>${fullName}</strong>,</p>
        <p>Your reservation at <span style="font-weight:600; color:#0078d7">${restaurantName}</span> is confirmed.</p>
        <table style="width:100%;background:#fff;border-radius:8px;padding:16px 8px;margin:16px 0;box-shadow:0 2px 8px #eee;font-size:1em;">
          <tr><td><b>Reservation ID:</b></td><td>${reservationId}</td></tr>
          <tr><td><b>Date:</b></td><td>${date}</td></tr>
          <tr><td><b>Time:</b></td><td>${time}</td></tr>
          <tr><td><b>No. of Customers:</b></td><td>${guests}</td></tr>
        </table>
        <p style="color:#555;">Thank you for choosing AeroX Dinings!<br>We look forward to serving you.</p>
        <div style="margin-top:24px;text-align:center;">
          <small style="color:#aaa;">&copy; ${new Date().getFullYear()} AeroX Dinings</small>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendOrderConfirmation,
  sendReservationConfirmation
};
