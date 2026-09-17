/**
 * Utility functions for date and time formatting
 */

/**
 * Formats a pickup time string to a simple HH.MM format with dots instead of colons
 * Handles various input formats including ISO dates, 12-hour time (AM/PM), and 24-hour time
 * 
 * @param pickupTime - The pickup time string to format
 * @returns Formatted time string in HH.MM format
 */
export function formatPickupTime(pickupTime: string): string {
  if (!pickupTime) return '';
  
  // If it's already in HH.MM format
  if (/^\d{1,2}\.\d{2}$/.test(pickupTime)) return pickupTime;
  
  // If it's already in HH:MM format, convert to HH.MM
  if (/^\d{1,2}:\d{2}$/.test(pickupTime)) {
    return pickupTime.replace(':', '.');
  }
  
  // If it's in HH:MM AM/PM format
  const timeMatch = pickupTime.match(/(\d{1,2}):(\d{2}) ?([APap][Mm])/);
  if (timeMatch) {
    let [_, hours, minutes, period] = timeMatch;
    let hoursNum = parseInt(hours, 10);
    if (period.toUpperCase() === 'PM' && hoursNum !== 12) hoursNum += 12;
    if (period.toUpperCase() === 'AM' && hoursNum === 12) hoursNum = 0;
    return `${hoursNum.toString().padStart(2, '0')}.${minutes}`;
  }
  
  // If it's a full date string or ISO format, extract the time
  try {
    const date = new Date(pickupTime);
    if (!isNaN(date.getTime())) {
      return `${date.getHours().toString().padStart(2, '0')}.${date.getMinutes().toString().padStart(2, '0')}`;
    }
  } catch (e) {
    // Fall through to default
  }
  
  // Return original if we can't parse it
  return pickupTime;
}
