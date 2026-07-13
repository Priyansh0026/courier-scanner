const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const otpController = require('../controllers/otpController');
const { protect } = require('../middleware/authMiddleware');
const limiters = require('../middleware/rateLimiter');
const validators = require('../middleware/validation');

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// Register User (Requires verified mobile & email OTP state)
router.post('/register', validators.validateRegister, authController.register);

// Login User (Protected by rate limiters)
router.post('/login', limiters.loginLimiter, validators.validateLogin, authController.login);

// Logout User
router.post('/logout', protect, authController.logout);

// Refresh Access Token
router.post('/refresh-token', authController.refreshToken);

// Fetch logged-in user profile details
router.get('/user/profile', protect, authController.getUserProfile);

// ==========================================
// OTP VERIFICATION ROUTES
// ==========================================

// Send Mobile Verification OTP (Rate limited)
router.post('/send-mobile-otp', limiters.otpLimiter, otpController.sendMobileOTP);

// Verify Mobile OTP code
router.post('/verify-mobile-otp', otpController.verifyMobileOTP);

// Send Email Verification OTP (Rate limited)
router.post('/send-email-otp', limiters.otpLimiter, otpController.sendEmailOTP);

// Verify Email OTP code
router.post('/verify-email-otp', otpController.verifyEmailOTP);

// ==========================================
// PASSWORD RECOVERY / FORGOT ROUTES
// ==========================================

// Request Forgot Password OTP
router.post('/forgot-password', validators.validateForgotPass, authController.forgotPassword);

// Verify Forgot Password OTP
router.post('/verify-reset-otp', authController.verifyResetOtp);

// Commit New Password Reset
router.post('/reset-password', validators.validateResetPass, authController.resetPassword);

module.exports = router;
