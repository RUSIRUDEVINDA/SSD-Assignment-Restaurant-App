// Utility to format Sri Lankan phone numbers to E.164 (+94XXXXXXXXX)
function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  let cleaned = phoneNumber.replace(/\D/g, '');
  // Remove leading 0 if present
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = cleaned.substring(1);
  }
  // Add +94 if not present
  if (!cleaned.startsWith('94')) {
    cleaned = `94${cleaned}`;
  }
  if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }
  return cleaned;
}

module.exports = { formatPhoneNumber };
