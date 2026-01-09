const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// @route   GET /api/stories
// @desc    Get stories from friends
// @access  Private
router.get('/', protect, storyController.getFriendStories);

// @route   GET /api/stories/user/:userId
// @desc    Get user's stories
// @access  Private
router.get('/user/:userId', protect, storyController.getUserStories);

// @route   GET /api/stories/:id
// @desc    Get story by ID
// @access  Private
router.get('/:id', protect, storyController.getStoryById);

// @route   POST /api/stories
// @desc    Create a story
// @access  Private
router.post('/', protect, upload.single('media'), storyController.createStory);

// @route   DELETE /api/stories/:id
// @desc    Delete a story
// @access  Private
router.delete('/:id', protect, storyController.deleteStory);

// @route   POST /api/stories/:id/view
// @desc    Add view to story
// @access  Private
router.post('/:id/view', protect, storyController.addView);

// @route   POST /api/stories/:id/reaction
// @desc    Add reaction to story
// @access  Private
router.post('/:id/reaction', protect, storyController.addReaction);

// @route   DELETE /api/stories/:id/reaction
// @desc    Remove reaction from story
// @access  Private
router.delete('/:id/reaction', protect, storyController.removeReaction);

// @route   POST /api/stories/:id/reply
// @desc    Reply to a story
// @access  Private
router.post('/:id/reply', protect, storyController.replyToStory);

// @route   GET /api/stories/:id/viewers
// @desc    Get story viewers
// @access  Private
router.get('/:id/viewers', protect, storyController.getStoryViewers);

module.exports = router;
