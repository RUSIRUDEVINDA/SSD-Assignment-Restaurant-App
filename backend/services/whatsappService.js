const twilio = require('twilio');
require('dotenv').config();
const { formatPhoneNumber } = require('../utils/phoneUtils');

// Initialize Twilio client with your credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client;

try {
  if (accountSid && authToken) {
    client = twilio(accountSid, authToken);
    console.log('Twilio client initialized successfully');
  } else {
    console.warn('Twilio credentials missing. WhatsApp functionality will be limited.');
  }
} catch (error) {
  console.error('Error initializing Twilio client:', error);
}

/**
 * Send a WhatsApp message using Twilio
 * @param {string} to - Recipient's phone number (format: +1234567890)
 * @param {string} message - Message content
 * @returns {Promise} - Promise resolving to message details or error
 */
const sendWhatsAppMessage = async (to, message) => {
  // Check if Twilio is properly configured
  if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.warn('Twilio credentials not configured. WhatsApp message not sent.');
    return { 
      success: false, 
      error: 'Twilio credentials not configured',
      simulatedMessage: { to, body: message }
    };
  }

  // Ensure phone number is properly formatted
  let formattedNumber = to;
  
  // Format the phone number using our utility
  if (!formattedNumber.startsWith('+')) {
    formattedNumber = formatPhoneNumber(formattedNumber);
  }
  
  // Important: For Twilio WhatsApp Sandbox testing, the recipient must have opted in
  // by sending a WhatsApp message with the code "join <sandbox-code>" to the Twilio number
  
  // Ensure 'whatsapp:' prefix for Twilio WhatsApp API
  const whatsappNumber = formattedNumber.startsWith('whatsapp:') 
    ? formattedNumber 
    : `whatsapp:${formattedNumber}`;
  
  console.log(`Attempting to send WhatsApp message to: ${whatsappNumber}`);

  try {
    // For development/testing, log the message instead of actually sending
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SIMULATED WHATSAPP] To: ${whatsappNumber}, Message: ${message}`);
      return { 
        success: true, 
        simulatedMessage: { to: whatsappNumber, body: message }
      };
    }
    
    // Send actual message in production
    if (!client) {
      throw new Error('Twilio client not initialized');
    }
    
    // Use direct SMS as a fallback if WhatsApp is not working
    // This ensures the customer gets notified even if WhatsApp fails
    const twilioMessage = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: whatsappNumber
    });
    
    console.log(`WhatsApp message sent with SID: ${twilioMessage.sid}`);
    
    // Also send as SMS for reliability
    try {
      // Send as regular SMS (remove whatsapp: prefix if present)
      const smsNumber = formattedNumber.replace('whatsapp:', '');
      
      // Use a regular Twilio phone number for SMS (not WhatsApp)
      const smsFrom = process.env.TWILIO_SMS_NUMBER || '+18446031482'; // Fallback to a default number
      
      const smsMessage = await client.messages.create({
        body: message,
        from: smsFrom,
        to: smsNumber
      });
      
      console.log(`SMS fallback sent with SID: ${smsMessage.sid}`);
    } catch (smsError) {
      console.error('Error sending SMS fallback:', smsError);
    }
    
    return { success: true, messageId: twilioMessage.sid };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    
    // Try to send as regular SMS as fallback
    try {
      if (client) {
        // Send as regular SMS (remove whatsapp: prefix if present)
        const smsNumber = formattedNumber.replace('whatsapp:', '');
        
        // Use a regular Twilio phone number for SMS (not WhatsApp)
        const smsFrom = process.env.TWILIO_SMS_NUMBER || '+18446031482'; // Fallback to a default number
        
        const smsMessage = await client.messages.create({
          body: message,
          from: smsFrom,
          to: smsNumber
        });
        
        console.log(`Fallback SMS sent with SID: ${smsMessage.sid}`);
        return { 
          success: true, 
          messageId: smsMessage.sid,
          method: 'sms-fallback'
        };
      }
    } catch (smsError) {
      console.error('Error sending fallback SMS:', smsError);
    }
    
    return { 
      success: false, 
      error: error.message,
      simulatedMessage: { to: whatsappNumber, body: message }
    };
  }
};

/**
 * Send order ready notification
 * @param {Object} order - Order details
 * @returns {Promise} - Promise resolving to message details
 */
const sendOrderReadyNotification = async (order) => {
  if (!order || !order.phoneNumber) {
    console.error('Invalid order or missing phone number:', order);
    return { success: false, error: 'Invalid order or missing phone number' };
  }
  
  console.log(`Preparing to send notification to ${order.fullName} at ${order.phoneNumber}`);
  
  const message = `Hello ${order.fullName},\n\nYour order from ${order.restaurantName} is now ready for pickup!\n\nOrder ID: ${order._id}\nPickup Time: ${order.pickupTime}\n\nThank you for using AeroX Restaurants.`;
  
  return sendWhatsAppMessage(order.phoneNumber, message);
};

module.exports = {
  sendWhatsAppMessage,
  sendOrderReadyNotification
};
