const https = require('https');

// Local in-memory store for OTP tracking
const otpStore = new Map();

// Helper to make native HTTPS GET requests
const sendGetRequest = (url) => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ return: false, message: 'Invalid JSON response from server' });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

class SMSService {
  constructor() {
    this.apiKey = process.env.FAST2SMS_API_KEY;

    this.isConfigured = 
      this.apiKey && 
      this.apiKey.trim() !== '' && 
      !this.apiKey.includes('your_fast2sms_key');

    if (this.isConfigured) {
      console.log('[JCMS SMS] Fast2SMS Gateway successfully initialized.');
    } else {
      console.log('[JCMS SMS] Fast2SMS key unconfigured. Running in local SMS Sandbox mode (check server log for codes).');
    }
  }

  /**
   * Send 6-digit OTP code to mobile number via Fast2SMS
   * @param {string} mobile 10-digit number without country code
   * @param {string} countryCode prefixed with +
   */
  async sendOTP(mobile, countryCode = '+91') {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 mins expiry

    // Save details in local memory database store
    otpStore.set(mobile, { code, expiry, attempts: 0 });

    if (this.isConfigured) {
      try {
        const messageText = `Your JCMS verification code is ${code}. It is valid for 5 minutes.`;
        const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(this.apiKey)}&route=q&message=${encodeURIComponent(messageText)}&numbers=${mobile}`;
        const result = await sendGetRequest(url);

        if (result && result.return === true) {
          console.log(`[JCMS SMS] Fast2SMS OTP successfully sent to ${mobile}`);
          return { success: true };
        } else {
          console.error('[JCMS SMS] Fast2SMS Send Error:', result.message || 'Unknown Fast2SMS API response');
          throw new Error(result.message || 'Fast2SMS returned failure response');
        }
      } catch (err) {
        console.error('[JCMS SMS] Fast2SMS Connection Error:', err.message);
        throw new Error(`SMS delivery failed: ${err.message}`);
      }
    } else {
      // Local Sandbox fallback
      console.log(`\n========================================`);
      console.log(`[JCMS SMS SANDBOX] OTP Sent to: ${countryCode}${mobile}`);
      console.log(`[JCMS SMS SANDBOX] Verification Code: ${code}`);
      console.log(`========================================\n`);

      return { success: true, sandbox: true, code };
    }
  }

  /**
   * Verify mobile OTP code
   * @param {string} mobile 10-digit number
   * @param {string} code 6-digit verification code
   * @param {string} countryCode prefixed with +
   */
  async verifyOTP(mobile, code, countryCode = '+91') {
    const record = otpStore.get(mobile);

    if (!record) {
      return { success: false, reason: 'No OTP requested for this mobile number.' };
    }

    if (Date.now() > record.expiry) {
      otpStore.delete(mobile);
      return { success: false, reason: 'OTP code has expired (5-minute limit).' };
    }

    if (record.attempts >= 5) {
      otpStore.delete(mobile);
      return { success: false, reason: 'Maximum verification attempts (5) exceeded. Request a new OTP.' };
    }

    if (record.code === code.trim()) {
      otpStore.delete(mobile); // Clear on success
      return { success: true };
    } else {
      record.attempts += 1;
      otpStore.set(mobile, record);
      const remaining = 5 - record.attempts;
      return { success: false, reason: `Incorrect OTP. Attempts remaining: ${remaining}/5` };
    }
  }
}

module.exports = new SMSService();
