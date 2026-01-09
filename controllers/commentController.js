const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// @desc    Get comments for a post
// @route   GET /api/comments/post/:postId
// @access  Private
exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({
      post: postId,
      parentComment: null,
      isDeleted: false
    })
      .populate('user', 'username firstName lastName avatar isVerified')
      .populate({
        path: 'replies',
        populate: { path: 'user', select: 'username firstName lastName avatar isVerified' }
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Comment.countDocuments({
      post: postId,
      parentComment: null,
      isDeleted: false
    });

    res.status(200).json({
      success: true,
      count: comments.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      comments
    });
  } catch (error) {
    console.error('Get post comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
};

// @desc    Get replies for a comment
// @route   GET /api/comments/:id/replies
// @access  Private
exports.getCommentReplies = async (req, res) => {
  try {
    const replies = await Comment.find({
      parentComment: req.params.id,
      isDeleted: false
    })
      .populate('user', 'username firstName lastName avatar isVerified')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: replies.length,
      replies
    });
  } catch (error) {
    console.error('Get comment replies error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching replies',
      error: error.message
    });
  }
};

// @desc    Create a comment on a post
// @route   POST /api/comments/post/:postId
// @access  Private
exports.createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const comment = await Comment.create({
      post: postId,
      user: req.user.id,
      content: content.trim()
    });

    await comment.populate('user', 'username firstName lastName avatar isVerified');

    // Increment post comment count
    await post.incrementCommentCount();

    // Notification
    if (post.user.toString() !== req.user.id) {
      await Notification.createNotification({
        recipient: post.user,
        sender: req.user.id,
        type: 'comment',
        title: 'New comment on your post',
        message: `\( {req.user.username} commented: " \){content}"`,
        relatedPost: post._id,
        relatedComment: comment._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating comment',
      error: error.message
    });
  }
};

// @desc    Reply to a comment
// @route   POST /api/comments/:id/reply
// @access  Private
exports.replyToComment = async (req, res) => {
  try {
    const { content } = req.body;
    const parentComment = await Comment.findById(req.params.id);

    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found'
      });
    }

    const reply = await Comment.create({
      post: parentComment.post,
      user: req.user.id,
      content: content.trim(),
      parentComment: req.params.id
    });

    await reply.populate('user', 'username firstName lastName avatar isVerified');

    // Notification
    if (parentComment.user.toString() !== req.user.id) {
      await Notification.createNotification({
        recipient: parentComment.user,
        sender: req.user.id,
        type: 'comment-reply',
        title: 'New reply to your comment',
        message: `\( {req.user.username} replied: " \){content}"`,
        relatedPost: parentComment.post,
        relatedComment: reply._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Reply created successfully',
      comment: reply
    });
  } catch (error) {
    console.error('Reply to comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating reply',
      error: error.message
    });
  }
};

// @desc    Update a comment
// @route   PUT /api/comments/:id
// @access  Private
exports.updateComment = async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    comment.content = content.trim();
    comment.isEdited = true;
    comment.editedAt = Date.now();

    await comment.save();
    await comment.populate('user', 'username firstName lastName avatar isVerified');

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating comment',
      error: error.message
    });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/comments/:id
// @access  Private
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const post = await Post.findById(comment.post);

    // Authorization: comment owner or post owner
    if (comment.user.toString() !== req.user.id && post.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Delete replies recursively
    await Comment.deleteMany({ parentComment: req.params.id });

    await comment.deleteOne();

    // Decrement post comment count
    await post.decrementCommentCount();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
      error: error.message
    });
  }
};

// @desc    Add reaction to comment
// @route   POST /api/comments/:id/reaction
// @access  Private
exports.addReaction = async (req, res) => {
  try {
    const { type } = req.body;
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    await comment.addReaction(req.user.id, type);

    res.status(200).json({
      success: true,
      message: 'Reaction added',
      reactionCount: comment.reactionCount
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding reaction',
      error: error.message
    });
  }
};

// @desc    Remove reaction from comment
// @route   DELETE /api/comments/:id/reaction
// @access  Private
exports.removeReaction = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    await comment.removeReaction(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Reaction removed',
      reactionCount: comment.reactionCount
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing reaction',
      error: error.message
    });
  }
};
