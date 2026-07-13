const jwt = require('jsonwebtoken');

/**
 * Generate a short-lived access token
 */
const generateAccessToken = (user) => {
  const userId = user._id || user.id;
  return jwt.sign(
    { id: userId, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * Generate a long-lived refresh token
 */
const generateRefreshToken = (user) => {
  const userId = user._id || user.id;
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Package JWTs into secure HttpOnly cookies and send JSON response
 */
const sendTokenResponse = async (user, statusCode, res, message = 'Success') => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  const userId = user._id || user.id;

  // Save the refresh token to the user record in MongoDB
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save();

  // Cookie options
  const isProduction = process.env.NODE_ENV === 'production';
  
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days (matching refresh token expiry)
  };

  // We set both tokens as cookies. Access token cookie maxAge can be shorter (15 minutes).
  const accessTokenOptions = {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000 // 15 minutes
  };

  res.cookie('accessToken', accessToken, accessTokenOptions);
  res.cookie('refreshToken', refreshToken, cookieOptions);

  return res.status(statusCode).json({
    success: true,
    message,
    token: accessToken,
    user: {
      id: userId,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      emailVerified: user.emailVerified,
      mobileVerified: user.mobileVerified,
      status: user.status
    }
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  sendTokenResponse
};
