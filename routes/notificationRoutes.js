const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', protect, notificationController.getNotifications);

// @route   GET /api/notifications/unread
// @desc    Get unread notifications
// @access  Private
router.get('/unread', protect, notificationController.getUnreadNotifications);

// @route   GET /api/notifications/count
// @desc    Get unread notification count
// @access  Private
router.get('/count', protect, notificationController.getUnreadCount);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', protect, notificationController.markAsRead);

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', protect, notificationController.markAllAsRead);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', protect, notificationController.deleteNotification);

// @route   DELETE /api/notifications
// @desc    Delete all notifications
// @access  Private
router.delete('/', protect, notificationController.deleteAllNotifications);

module.exports = router;
