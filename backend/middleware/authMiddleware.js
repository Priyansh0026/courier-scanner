const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Retrieve token from cookies or authorization header (prioritize Authorization header)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized: Access token is missing.'
    });
  }

  try {
    // Decode and verify access token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Fetch user from MongoDB
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized: User account does not exist.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Your account has been suspended.'
      });
    }

    // Attach user record object to request wrapper
    req.user = user;
    next();
  } catch (error) {
    console.error('[JCMS Auth Middleware] Token verification failed:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'Access token expired. Please refresh your session.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized: Invalid or malformed access token.'
    });
  }
};

module.exports = {
  protect
};
