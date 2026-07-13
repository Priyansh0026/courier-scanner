const User = require('../models/User');
const OTPVerification = require('../models/OTPVerification');
const tokenUtils = require('../utils/tokenUtils');
const smsService = require('../services/smsService');
const emailService = require('../services/emailService');
const jwt = require('jsonwebtoken');

/**
 * Register a new user
 * POST /api/register
 */
const register = async (req, res) => {
  const { name, email, mobile, password } = req.body;

  try {
    // 1. Verify that BOTH email and mobile have been verified via OTP
    const now = new Date();
    const emailVerifyRecord = await OTPVerification.findOne({
      identifier: email.toLowerCase(),
      verified: true,
      expiry: { $gt: now }
    });
    const mobileVerifyRecord = await OTPVerification.findOne({
      identifier: mobile,
      verified: true,
      expiry: { $gt: now }
    });

    if (!emailVerifyRecord) {
      return res.status(400).json({
        success: false,
        message: 'Registration blocked: Your email address is not verified via OTP.'
      });
    }

    if (!mobileVerifyRecord) {
      return res.status(400).json({
        success: false,
        message: 'Registration blocked: Your mobile number is not verified via OTP.'
      });
    }

    // 2. Ensure User doesn't already exist
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    const mobileExists = await User.findOne({ mobile });

    if (emailExists) {
      return res.status(400).json({ success: false, message: 'This email is already registered.' });
    }

    if (mobileExists) {
      return res.status(400).json({ success: false, message: 'This mobile number is already registered.' });
    }

    // 3. Create User in MongoDB
    await User.create({
      name,
      email: email.toLowerCase(),
      mobile,
      password, // Pre-save hook hashes this
      role: 'owner',
      status: 'active',
      emailVerified: true,
      mobileVerified: true
    });

    // Delete temporary OTP verification records
    await OTPVerification.deleteMany({ identifier: { $in: [email.toLowerCase(), mobile] } });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully!'
    });
  } catch (error) {
    console.error('[JCMS Auth Controller] Register error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Database error.'
    });
  }
};

/**
 * Log in User
 * POST /api/login
 */
const login = async (req, res) => {
  const { emailOrMobile, password } = req.body;

  try {
    let user = await User.findOne({
      $or: [
        { email: emailOrMobile.toLowerCase() },
        { mobile: emailOrMobile }
      ]
    }).select('+password');

    // Special fallback to allow mock logging in
    const isMockTrigger = !user && emailOrMobile === 'owner@jaincourier.com' && password === 'Jcms@2026';

    if (isMockTrigger) {
      user = await User.create({
        name: 'Vikas Prasad',
        email: 'owner@jaincourier.com',
        mobile: '9876543210',
        password: 'Jcms@2026', // Pre-save hook hashes this
        role: 'owner',
        status: 'active',
        emailVerified: true,
        mobileVerified: true
      });
      // Query again to get password field active if needed, although user object here is active
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials. User record not found.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Your account has been suspended.'
      });
    }

    // Compare password using Schema method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.'
      });
    }

    // Clear attempts and update lastLogin
    user.loginAttempts = 0;
    user.lastLogin = new Date();
    await user.save();

    // Send response with JWTs
    return tokenUtils.sendTokenResponse(user, 200, res, 'Login successful.');
  } catch (error) {
    console.error('[JCMS Auth Controller] Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.'
    });
  }
};

/**
 * Terminate user session and clear cookies
 * POST /api/logout
 */
const logout = async (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
};

/**
 * Refresh expired access token
 * POST /api/refresh-token
 */
const refreshToken = async (req, res) => {
  const token = req.cookies.refreshToken || req.body.refreshToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Refresh token is missing.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
    }

    const accessToken = tokenUtils.generateAccessToken(user);
    return res.status(200).json({
      success: true,
      token: accessToken
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
  }
};

/**
 * Request Password Reset (Send OTP)
 * POST /api/forgot-password
 */
const forgotPassword = async (req, res) => {
  const { emailOrMobile } = req.body;

  try {
    const user = await User.findOne({
      $or: [
        { email: emailOrMobile.toLowerCase() },
        { mobile: emailOrMobile }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered user matches that email or mobile number.'
      });
    }

    const isEmail = emailOrMobile.includes('@');
    let result;

    if (isEmail) {
      result = await emailService.sendOTP(emailOrMobile.toLowerCase());
    } else {
      result = await smsService.sendOTP(emailOrMobile);
    }

    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Clear old reset records and save new verified=false token state
    await OTPVerification.deleteMany({ identifier: emailOrMobile.toLowerCase() });
    await OTPVerification.create({
      identifier: emailOrMobile.toLowerCase(),
      verified: false,
      expiry
    });

    const isSandbox = result.sandbox || false;

    return res.status(200).json({
      success: true,
      message: 'Password reset code sent successfully!',
      sandbox: isSandbox,
      code: isSandbox ? result.otp : undefined
    });
  } catch (error) {
    console.error('[JCMS Auth Controller] Forgot Password error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to request password reset. Database error.'
    });
  }
};

/**
 * Verify Reset Password OTP code
 * POST /api/verify-reset-otp
 */
const verifyResetOtp = async (req, res) => {
  const { emailOrMobile, code } = req.body;

  try {
    const now = new Date();
    // In emailService/smsService sandbox, the OTP code matches the mock check.
    // If SMTP is unconfigured, emailService verifies it in-memory.
    // We assume the verified parameter is set by verify endpoint, or we lookup.
    // For password reset, they verify code first:
    const isEmail = emailOrMobile.includes('@');
    let verifyResult;
    if (isEmail) {
      verifyResult = await emailService.verifyOTP(emailOrMobile.toLowerCase(), code);
    } else {
      verifyResult = await smsService.verifyOTP(emailOrMobile, code);
    }

    if (verifyResult.success) {
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      await OTPVerification.findOneAndUpdate(
        { identifier: emailOrMobile.toLowerCase() },
        { identifier: emailOrMobile.toLowerCase(), verified: true, expiry },
        { upsert: true, new: true }
      );

      return res.status(200).json({
        success: true,
        message: 'Code verified successfully!'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: verifyResult.reason || 'Incorrect verification code.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'OTP verification failed. Database error.'
    });
  }
};

/**
 * Reset User Password
 * POST /api/reset-password
 */
const resetPassword = async (req, res) => {
  const { emailOrMobile, password } = req.body;

  try {
    const now = new Date();
    const verifyRecord = await OTPVerification.findOne({
      identifier: emailOrMobile.toLowerCase(),
      verified: true,
      expiry: { $gt: now }
    });

    if (!verifyRecord) {
      return res.status(400).json({
        success: false,
        message: 'Password reset session expired or unauthorized. Verify code again.'
      });
    }

    const user = await User.findOne({
      $or: [
        { email: emailOrMobile.toLowerCase() },
        { mobile: emailOrMobile }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.'
      });
    }

    user.password = password; // Pre-save hook hashes this
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await OTPVerification.deleteOne({ identifier: emailOrMobile.toLowerCase() });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully! You can now log in.'
    });
  } catch (error) {
    console.error('[JCMS Auth Controller] Reset Password error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Reset password processing failed. Database error.'
    });
  }
};

/**
 * Get User Profile
 * GET /api/user/profile
 */
const getUserProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id || req.user.id,
      name: req.user.name,
      email: req.user.email,
      mobile: req.user.mobile,
      role: req.user.role,
      emailVerified: req.user.emailVerified,
      mobileVerified: req.user.mobileVerified,
      status: req.user.status,
      createdAt: req.user.createdAt
    }
  });
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getUserProfile
};
