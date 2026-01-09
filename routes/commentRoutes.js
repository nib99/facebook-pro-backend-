const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/comments/post/:postId
// @desc    Get comments for a post
// @access  Private
router.get('/post/:postId', protect, commentController.getPostComments);

// @route   GET /api/comments/:id/replies
// @desc    Get replies for a comment
// @access  Private
router.get('/:id/replies', protect, commentController.getCommentReplies);

// @route   POST /api/comments/post/:postId
// @desc    Create a comment on a post
// @access  Private
router.post('/post/:postId', protect, commentController.createComment);

// @route   POST /api/comments/:id/reply
// @desc    Reply to a comment
// @access  Private
router.post('/:id/reply', protect, commentController.replyToComment);

// @route   PUT /api/comments/:id
// @desc    Update a comment
// @access  Private
router.put('/:id', protect, commentController.updateComment);

// @route   DELETE /api/comments/:id
// @desc    Delete a comment
// @access  Private
router.delete('/:id', protect, commentController.deleteComment);

// @route   POST /api/comments/:id/reaction
// @desc    Add reaction to comment
// @access  Private
router.post('/:id/reaction', protect, commentController.addReaction);

// @route   DELETE /api/comments/:id/reaction
// @desc    Remove reaction from comment
// @access  Private
router.delete('/:id/reaction', protect, commentController.removeReaction);

module.exports = router;
