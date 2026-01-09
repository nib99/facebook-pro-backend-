const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// @route   GET /api/posts
// @desc    Get all posts (feed)
// @access  Private
router.get('/', protect, postController.getFeed);

// @route   GET /api/posts/trending
// @desc    Get trending posts
// @access  Private
router.get('/trending', protect, postController.getTrendingPosts);

// @route   GET /api/posts/search
// @desc    Search posts
// @access  Private
router.get('/search', protect, postController.searchPosts);

// @route   GET /api/posts/hashtag/:hashtag
// @desc    Get posts by hashtag
// @access  Private
router.get('/hashtag/:hashtag', protect, postController.getPostsByHashtag);

// @route   GET /api/posts/user/:userId
// @desc    Get user's posts
// @access  Private
router.get('/user/:userId', protect, postController.getUserPosts);

// @route   GET /api/posts/:id
// @desc    Get post by ID
// @access  Private
router.get('/:id', protect, postController.getPostById);

// @route   POST /api/posts
// @desc    Create a post
// @access  Private
router.post('/', protect, upload.array('media', 10), postController.createPost);

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private
router.put('/:id', protect, postController.updatePost);

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', protect, postController.deletePost);

// @route   POST /api/posts/:id/reaction
// @desc    Add reaction to post
// @access  Private
router.post('/:id/reaction', protect, postController.addReaction);

// @route   DELETE /api/posts/:id/reaction
// @desc    Remove reaction from post
// @access  Private
router.delete('/:id/reaction', protect, postController.removeReaction);

// @route   POST /api/posts/:id/share
// @desc    Share a post
// @access  Private
router.post('/:id/share', protect, postController.sharePost);

// @route   POST /api/posts/:id/save
// @desc    Save a post
// @access  Private
router.post('/:id/save', protect, postController.savePost);

// @route   DELETE /api/posts/:id/save
// @desc    Unsave a post
// @access  Private
router.delete('/:id/save', protect, postController.unsavePost);

// @route   GET /api/posts/saved/all
// @desc    Get saved posts
// @access  Private
router.get('/saved/all', protect, postController.getSavedPosts);

// @route   POST /api/posts/:id/pin
// @desc    Pin a post
// @access  Private
router.post('/:id/pin', protect, postController.pinPost);

// @route   POST /api/posts/:id/archive
// @desc    Archive a post
// @access  Private
router.post('/:id/archive', protect, postController.archivePost);

// @route   POST /api/posts/:id/report
// @desc    Report a post
// @access  Private
router.post('/:id/report', protect, postController.reportPost);

// @route   POST /api/posts/:id/view
// @desc    Increment view count
// @access  Private
router.post('/:id/view', protect, postController.incrementViewCount);

module.exports = router;
