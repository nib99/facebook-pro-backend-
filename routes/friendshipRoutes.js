const express = require('express');
const router = express.Router();
const friendshipController = require('../controllers/friendshipController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/friendships/requests
// @desc    Get pending friend requests
// @access  Private
router.get('/requests', protect, friendshipController.getPendingRequests);

// @route   GET /api/friendships/sent
// @desc    Get sent friend requests
// @access  Private
router.get('/sent', protect, friendshipController.getSentRequests);

// @route   POST /api/friendships/request/:userId
// @desc    Send friend request
// @access  Private
router.post('/request/:userId', protect, friendshipController.sendFriendRequest);

// @route   PUT /api/friendships/accept/:requestId
// @desc    Accept friend request
// @access  Private
router.put('/accept/:requestId', protect, friendshipController.acceptFriendRequest);

// @route   PUT /api/friendships/reject/:requestId
// @desc    Reject friend request
// @access  Private
router.put('/reject/:requestId', protect, friendshipController.rejectFriendRequest);

// @route   DELETE /api/friendships/cancel/:requestId
// @desc    Cancel sent friend request
// @access  Private
router.delete('/cancel/:requestId', protect, friendshipController.cancelFriendRequest);

// @route   DELETE /api/friendships/unfriend/:userId
// @desc    Unfriend a user
// @access  Private
router.delete('/unfriend/:userId', protect, friendshipController.unfriend);

// @route   GET /api/friendships/status/:userId
// @desc    Check friendship status with user
// @access  Private
router.get('/status/:userId', protect, friendshipController.checkFriendshipStatus);

module.exports = router;
