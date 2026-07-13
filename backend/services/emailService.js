const nodemailer = require('nodemailer');

// In-memory store for fallback OTP tracking when SMTP is unconfigured
const sandboxEmailOtpStore = new Map();

class EmailService {
  constructor() {
    this.host = process.env.SMTP_HOST;
    this.port = parseInt(process.env.SMTP_PORT) || 587;
    this.user = process.env.SMTP_USER;
    this.pass = process.env.SMTP_PASS;
    this.from = process.env.EMAIL_FROM || '"Jain Courier Management System (JCMS)" <no-reply@jaincourier.com>';

    this.isConfigured = 
      this.host && 
      this.user && 
      this.pass && 
      !this.user.includes('your_gmail_address');

    if (this.isConfigured) {
      try {
        this.transporter = nodemailer.createTransport({
          host: this.host,
          port: this.port,
          secure: this.port === 465, // Use SSL/TLS for 465, STARTTLS for 587
          auth: {
            user: this.user,
            pass: this.pass
          }
        });
        
        // Verify connection configuration
        this.transporter.verify((err) => {
          if (err) {
            console.error('[JCMS Email] SMTP Configuration verification failed:', err.message);
            this.isConfigured = false;
          } else {
            console.log('[JCMS Email] Nodemailer SMTP connection established successfully.');
          }
        });
      } catch (err) {
        console.error('[JCMS Email] Failed to initialize mail transporter:', err.message);
        this.isConfigured = false;
      }
    } else {
      console.log('[JCMS Email] SMTP keys unconfigured. Running in local Email Sandbox mode (check server log for codes).');
    }
  }

  /**
   * Send 6-digit Email Verification OTP
   * @param {string} email Target receiver email address
   * @returns {Promise<{success: boolean}>}
   */
  async sendOTP(email) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 mins expiry
    
    // Store in-memory for verification match
    sandboxEmailOtpStore.set(email, { code: otp, expiry, attempts: 0 });

    if (this.isConfigured) {
      try {
        const mailOptions = {
          from: this.from,
          to: email,
          subject: `${otp} is your JCMS Verification Code`,
          html: this.getHtmlTemplate(otp)
        };

        await this.transporter.sendMail(mailOptions);
        return { success: true };
      } catch (err) {
        console.error('[JCMS Email] Error sending SMTP mail:', err.message);
        throw new Error(`Email delivery failed: ${err.message}`);
      }
    } else {
      // Local Sandbox mode execution
      console.log(`\n========================================`);
      console.log(`[JCMS EMAIL SANDBOX] OTP Sent to: ${email}`);
      console.log(`[JCMS EMAIL SANDBOX] Verification Code: ${otp}`);
      console.log(`========================================\n`);

      return { success: true, sandbox: true, code: otp };
    }
  }

  /**
   * Verify email OTP code matching
   * @param {string} email Target email
   * @param {string} code 6-digit entered code
   */
  async verifyOTP(email, code) {
    const record = sandboxEmailOtpStore.get(email);

    if (!record) {
      return { success: false, reason: 'No OTP requested for this email address.' };
    }

    if (Date.now() > record.expiry) {
      sandboxEmailOtpStore.delete(email);
      return { success: false, reason: 'OTP code has expired (5-minute limit).' };
    }

    if (record.attempts >= 5) {
      sandboxEmailOtpStore.delete(email);
      return { success: false, reason: 'Maximum validation attempts (5) exceeded. Please request a new OTP.' };
    }

    record.attempts++;

    if (record.code === code) {
      sandboxEmailOtpStore.delete(email); // Verification success: clear OTP
      return { success: true };
    } else {
      return { success: false, reason: `Incorrect OTP. Attempts left: ${5 - record.attempts}` };
    }
  }

  /**
   * Professional HTML Courier template
   */
  getHtmlTemplate(otp) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>JCMS Verification Code</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 0; }
        .email-container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
        .content { padding: 40px; line-height: 1.6; }
        .otp-box { background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 8px; font-size: 32px; font-weight: 800; letter-spacing: 6px; text-align: center; padding: 15px; margin: 30px 0; color: #2563eb; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 11px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>JCMS Authentication Portal</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>Thank you for registering with <strong>Jain Courier Management System (JCMS)</strong>. Use the verification code below to verify your email address. This code is valid for <strong>5 minutes</strong>.</p>
          <div class="otp-box">${otp}</div>
          <p>If you did not initiate this request, please ignore this email or contact support if you suspect suspicious activity.</p>
        </div>
        <div class="footer">
          <p>&copy; 2026 Jain Courier Services. All rights reserved.</p>
          <p>This is an automated email. Please do not reply directly to this message.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }
}

module.exports = new EmailService();
