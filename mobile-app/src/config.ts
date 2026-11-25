/**
 * Diksha Real Estate Mobile Companion Configuration
 */
export const APP_CONFIG = {
  // Update with your production domain or local IP when testing (e.g. http://192.168.1.5:3000)
  API_BASE_URL: process.env.VITE_API_BASE_URL || 'https://crm.diksharealestate.com',
  
  // Tracking intervals
  TRACKING: {
    // Regular ping every 3 minutes (180,000 ms) while on duty
    PING_INTERVAL_MS: 3 * 60 * 1000,
    
    // If agent is driving or moving fast, ping every 1 minute
    FAST_PING_INTERVAL_MS: 60 * 1000,
    
    // Distance filter in meters before forcing an instant ping
    DISTANCE_THRESHOLD_METERS: 75,
    
    // Low battery threshold to trigger power-saving GPS
    LOW_BATTERY_PERCENT: 15,
  },
  
  // Company details
  COMPANY_NAME: 'Diksha Real Estate',
  HELPDESK_PHONE: '+91 98390 12005',
};
