const express = require('express');
const router = express.Router();
const liveStreamController = require('../controllers/liveStreamController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/streams
// @desc    Get active live streams
// @access  Private
router.get('/', protect, liveStreamController.getActiveStreams);

// @route   GET /api/streams/trending
// @desc    Get trending streams
// @access  Private
router.get('/trending', protect, liveStreamController.getTrendingStreams);

// @route   GET /api/streams/featured
// @desc    Get featured streams
// @access  Private
router.get('/featured', protect, liveStreamController.getFeaturedStreams);

// @route   GET /api/streams/search
// @desc    Search streams
// @access  Private
router.get('/search', protect, liveStreamController.searchStreams);

// @route   GET /api/streams/user/:userId
// @desc    Get user's streams
// @access  Private
router.get('/user/:userId', protect, liveStreamController.getUserStreams);

// @route   GET /api/streams/:id
// @desc    Get stream by ID
// @access  Private
router.get('/:id', protect, liveStreamController.getStreamById);

// @route   POST /api/streams
// @desc    Create a live stream
// @access  Private
router.post('/', protect, liveStreamController.createStream);

// @route   PUT /api/streams/:id/start
// @desc    Start a stream
// @access  Private
router.put('/:id/start', protect, liveStreamController.startStream);

// @route   PUT /api/streams/:id/end
// @desc    End a stream
// @access  Private
router.put('/:id/end', protect, liveStreamController.endStream);

// @route   PUT /api/streams/:id/pause
// @desc    Pause a stream
// @access  Private
router.put('/:id/pause', protect, liveStreamController.pauseStream);

// @route   PUT /api/streams/:id/resume
// @desc    Resume a stream
// @access  Private
router.put('/:id/resume', protect, liveStreamController.resumeStream);

// @route   POST /api/streams/:id/join
// @desc    Join a stream (add viewer)
// @access  Private
router.post('/:id/join', protect, liveStreamController.joinStream);

// @route   POST /api/streams/:id/leave
// @desc    Leave a stream (remove viewer)
// @access  Private
router.post('/:id/leave', protect, liveStreamController.leaveStream);

// @route   POST /api/streams/:id/like
// @desc    Like a stream
// @access  Private
router.post('/:id/like', protect, liveStreamController.likeStream);

// @route   DELETE /api/streams/:id/like
// @desc    Unlike a stream
// @access  Private
router.delete('/:id/like', protect, liveStreamController.unlikeStream);

// @route   POST /api/streams/:id/comment
// @desc    Comment on a stream
// @access  Private
router.post('/:id/comment', protect, liveStreamController.commentOnStream);

// @route   POST /api/streams/:id/share
// @desc    Share a stream
// @access  Private
router.post('/:id/share', protect, liveStreamController.shareStream);

// @route   GET /api/streams/:id/comments
// @desc    Get stream comments
// @access  Private
router.get('/:id/comments', protect, liveStreamController.getStreamComments);

module.exports = router;
