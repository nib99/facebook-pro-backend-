const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', protect, userController.getAllUsers);

// @route   GET /api/users/search
// @desc    Search users
// @access  Private
router.get('/search', protect, userController.searchUsers);

// @route   GET /api/users/suggested
// @desc    Get suggested friends
// @access  Private
router.get('/suggested', protect, userController.getSuggestedFriends);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', protect, userController.getUserById);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, userController.updateProfile);

// @route   PUT /api/users/avatar
// @desc    Upload/Update avatar
// @access  Private
router.put('/avatar', protect, upload.single('avatar'), userController.uploadAvatar);

// @route   PUT /api/users/cover-photo
// @desc    Upload/Update cover photo
// @access  Private
router.put('/cover-photo', protect, upload.single('coverPhoto'), userController.uploadCoverPhoto);

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private
router.delete('/:id', protect, userController.deleteUser);

// @route   GET /api/users/:id/friends
// @desc    Get user's friends
// @access  Private
router.get('/:id/friends', protect, userController.getUserFriends);

// @route   GET /api/users/:id/followers
// @desc    Get user's followers
// @access  Private
router.get('/:id/followers', protect, userController.getUserFollowers);

// @route   GET /api/users/:id/following
// @desc    Get users that user is following
// @access  Private
router.get('/:id/following', protect, userController.getUserFollowing);

// @route   POST /api/users/:id/follow
// @desc    Follow a user
// @access  Private
router.post('/:id/follow', protect, userController.followUser);

// @route   POST /api/users/:id/unfollow
// @desc    Unfollow a user
// @access  Private
router.post('/:id/unfollow', protect, userController.unfollowUser);

// @route   POST /api/users/:id/block
// @desc    Block a user
// @access  Private
router.post('/:id/block', protect, userController.blockUser);

// @route   POST /api/users/:id/unblock
// @desc    Unblock a user
// @access  Private
router.post('/:id/unblock', protect, userController.unblockUser);

// @route   PUT /api/users/settings
// @desc    Update user settings
// @access  Private
router.put('/settings', protect, userController.updateSettings);

// @route   PUT /api/users/online-status
// @desc    Update online status
// @access  Private
router.put('/online-status', protect, userController.updateOnlineStatus);

module.exports = router;
