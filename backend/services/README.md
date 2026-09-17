# WhatsApp Integration for AeroX Restaurants

This service integrates Twilio's WhatsApp API to send notifications to customers when their orders are ready for pickup.

## Setup Instructions

1. **Create a Twilio Account**:
   - Sign up at [Twilio](https://www.twilio.com/try-twilio)
   - Verify your email and phone number

2. **Set Up WhatsApp Sandbox**:
   - Navigate to the Twilio Console
   - Go to Messaging > Try it out > Send a WhatsApp message
   - Follow the instructions to join your sandbox

3. **Get Your Credentials**:
   - From the Twilio Console Dashboard, copy your:
     - Account SID
     - Auth Token
     - WhatsApp number (format: whatsapp:+14155238886)

4. **Update Environment Variables**:
   - Open the `.env` file in the project root
   - Replace the placeholder values with your actual Twilio credentials:
   ```
   TWILIO_ACCOUNT_SID=your_actual_account_sid
   TWILIO_AUTH_TOKEN=your_actual_auth_token
   TWILIO_PHONE_NUMBER=whatsapp:+14155238886  # Use your actual Twilio WhatsApp number
   ```

5. **Test the Integration**:
   - Update an order status to "ready for pickup" in the admin dashboard
   - Check the console logs to see if the WhatsApp message was sent successfully
   - For testing, messages will be simulated and logged to the console

## Important Notes

- In development mode, messages are simulated and logged to the console
- To send actual WhatsApp messages, set NODE_ENV to 'production'
- Customers must opt-in to receive WhatsApp messages by sending a message to your Twilio WhatsApp number
- The free Twilio sandbox has limitations on message volume and templates

## Troubleshooting

- If messages aren't being sent, check:
  - Your Twilio credentials in the .env file
  - Console logs for any error messages
  - That the customer's phone number is in the correct format
  - That the customer has opted in to your WhatsApp sandbox
