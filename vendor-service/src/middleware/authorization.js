const logger = require('../utils/logger');

/**
 * Authorize roles middleware
 */
const authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const userRole = req.user.role.toUpperCase();

      // Check if user's role is in the allowed roles
      const hasPermission = allowedRoles
        .map((role) => role.toUpperCase())
        .includes(userRole);

      if (!hasPermission) {
        logger.warn('Unauthorized access attempt', {
          authId: req.user.authId,
          role: userRole,
          requiredRoles: allowedRoles,
          path: req.path,
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization failed',
      });
    }
  };
};

module.exports = {
  authorizeRoles,
};
