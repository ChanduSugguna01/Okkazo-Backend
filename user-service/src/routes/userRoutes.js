const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorization');
const { validateUser, validateUserUpdate } = require('../middleware/validation');

// Public routes
router.get('/health', userController.healthCheck);

// Protected routes - require authentication
router.use(authenticate);

// User profile routes
router.get('/me', userController.getCurrentUser);
router.put('/me', validateUserUpdate, userController.updateCurrentUser);
router.post('/login', userController.updateLastLogin);

// User lookup routes
router.get('/auth/:authId', userController.getUserByAuthId);
router.get('/email/:email', userController.getUserByEmail);

// Admin routes
router.get(
  '/stats',
  authorizeRoles(['ADMIN', 'MANAGER']),
  userController.getUserStats
);

router.get(
  '/',
  authorizeRoles(['ADMIN', 'MANAGER']),
  userController.getAllUsers
);

router.get(
  '/:id',
  authorizeRoles(['ADMIN', 'MANAGER']),
  userController.getUserById
);

router.put(
  '/:id',
  authorizeRoles(['ADMIN', 'MANAGER']),
  validateUserUpdate,
  userController.updateUser
);

router.delete(
  '/:id',
  authorizeRoles(['ADMIN']),
  userController.deleteUser
);

module.exports = router;
