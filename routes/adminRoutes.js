const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

// Apply admin authorization to all routes
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/stats', adminController.getDashboardStats);

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/suspend', adminController.suspendUser);
router.put('/users/:id/unsuspend', adminController.unsuspendUser);
router.put('/users/:id/verify', adminController.verifyUserAccount);
router.delete('/users/:id', adminController.deleteUser);

// Post management
router.get('/posts', adminController.getAllPosts);
router.delete('/posts/:id', adminController.deletePost);

// Report management
router.get('/reports', adminController.getAllReports);
router.put('/reports/:id', adminController.updateReportStatus);

// Group management
router.get('/groups', adminController.getAllGroups);
router.delete('/groups/:id', adminController.deleteGroup);

// Broadcast
router.post('/broadcast', adminController.sendBroadcast);

module.exports = router;
