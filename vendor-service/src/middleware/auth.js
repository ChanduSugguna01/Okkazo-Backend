const logger = require('../utils/logger');

/**
 * Authenticate middleware - extracts user info from headers set by API Gateway
 */
const authenticate = (req, res, next) => {
  try {
    // Extract user information from headers (set by API Gateway)
    const userId = req.headers['x-user-id'];
    const email = req.headers['x-user-email'];
    const username = req.headers['x-user-username'];
    const role = req.headers['x-user-role'];

    if (!userId || !email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Attach user info to request object
    req.user = {
      authId: userId,
      email,
      username,
      role: role || 'USER',
    };

    logger.debug('User authenticated', {
      authId: userId,
      email,
      role,
    });

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

module.exports = {
  authenticate,
};
