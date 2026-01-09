const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');

// @desc    Get feed posts
// @route   GET /api/posts
// @access  Private
exports.getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user.id);
    const friendIds = [...user.friends.map(f => f._id), req.user.id];

    const posts = await Post.find({
      user: { $in: friendIds },
      visibility: { $in: ['public', 'friends'] },
      isArchived: false
    })
      .populate('user', 'username firstName lastName avatar isVerified')
      .populate({
        path: 'sharedPost',
        populate: { path: 'user', select: 'username firstName lastName avatar isVerified' }
      })
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Post.countDocuments({
      user: { $in: friendIds },
      visibility: { $in: ['public', 'friends'] },
      isArchived: false
    });

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      posts
    });
  } catch (error) {
    console.error('Get feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feed',
      error: error.message
    });
  }
};

// @desc    Get trending posts
// @route   GET /api/posts/trending
// @access  Private
exports.getTrendingPosts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const days = parseInt(req.query.days) || 7;

    const timeAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const posts = await Post.getTrendingPosts(limit, days * 24);

    res.status(200).json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('Get trending posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching trending posts',
      error: error.message
    });
  }
};

// @desc    Search posts
// @route   GET /api/posts/search
// @access  Private
exports.searchPosts = async (req, res) => {
  try {
    const { q } = req.query;
    const limit = parseInt(req.query.limit) || 20;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const posts = await Post.searchPosts(q.trim(), limit);

    res.status(200).json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('Search posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching posts',
      error: error.message
    });
  }
};

// @desc    Get posts by hashtag
// @route   GET /api/posts/hashtag/:hashtag
// @access  Private
exports.getPostsByHashtag = async (req, res) => {
  try {
    const { hashtag } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const posts = await Post.getPostsByHashtag(hashtag, limit);

    res.status(200).json({
      success: true,
      count: posts.length,
      hashtag,
      posts
    });
  } catch (error) {
    console.error('Get posts by hashtag error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
};

// @desc    Get user's posts
// @route   GET /api/posts/user/:userId
// @access  Private
exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isOwner = req.user.id === userId;
    const isFriend = targetUser.friends.some(f => f.toString() === req.user.id);

    let visibilityFilter = ['public'];
    if (isOwner) visibilityFilter = ['public', 'friends', 'private'];
    else if (isFriend) visibilityFilter = ['public', 'friends'];

    const posts = await Post.find({
      user: userId,
      visibility: { $in: visibilityFilter },
      isArchived: false
    })
      .populate('user', 'username firstName lastName avatar isVerified')
      .sort({ isPinned: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Post.countDocuments({
      user: userId,
      visibility: { $in: visibilityFilter },
      isArchived: false
    });

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      posts
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
};

// @desc    Get post by ID
// @route   GET /api/posts/:id
// @access  Private
exports.getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username firstName lastName avatar isVerified')
      .populate('mentions', 'username avatar')
      .populate({
        path: 'sharedPost',
        populate: { path: 'user', select: 'username firstName lastName avatar isVerified' }
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Privacy check
    if (post.visibility === 'private' && post.user._id.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'This post is private'
      });
    }

    if (post.visibility === 'friends') {
      const isFriend = post.user.friends.some(f => f.toString() === req.user.id);
      if (!isFriend && post.user._id.toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'This post is only visible to friends'
        });
      }
    }

    // Increment view count
    await post.incrementViewCount();

    res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Get post by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching post',
      error: error.message
    });
  }
};

// @desc    Create a post
// @route   POST /api/posts
// @access  Private
exports.createPost = async (req, res) => {
  try {
    const { content, visibility, location, feeling, mentions } = req.body;

    const postData = {
      user: req.user.id,
      content: content?.trim(),
      visibility: visibility || 'public',
      location,
      feeling
    };

    if (mentions && Array.isArray(mentions)) {
      postData.mentions = mentions;
    }

    // Handle media
    if (req.files && req.files.length > 0) {
      const mediaPromises = req.files.map(async (file) => {
        const result = await cloudinary.uploadToCloudinary(file.path, 'posts');
        return {
          type: file.mimetype.startsWith('video') ? 'video' : 'image',
          url: result.url,
          publicId: result.publicId,
          thumbnail: result.thumbnail || result.url
        };
      });
      postData.media = await Promise.all(mediaPromises);
    }

    const post = await Post.create(postData);

    await post.populate('user', 'username firstName lastName avatar isVerified');
    await post.populate('mentions', 'username avatar');

    // Notifications for mentions
    if (mentions && mentions.length > 0) {
      const notifications = mentions
        .filter(id => id.toString() !== req.user.id)
        .map(userId => Notification.createNotification({
          recipient: userId,
          sender: req.user.id,
          type: 'mention',
          title: 'You were mentioned in a post',
          message: `${req.user.username} mentioned you in a post`,
          relatedPost: post._id
        }));
      await Promise.all(notifications);
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating post',
      error: error.message
    });
  }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const { content, visibility, feeling } = req.body;

    if (content !== undefined) post.content = content.trim();
    if (visibility !== undefined) post.visibility = visibility;
    if (feeling !== undefined) post.feeling = feeling;

    post.isEdited = true;
    post.editedAt = Date.now();

    await post.save();
    await post.populate('user', 'username firstName lastName avatar isVerified');

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating post',
      error: error.message
    });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    // Delete media from Cloudinary
    if (post.media && post.media.length > 0) {
      const deletePromises = post.media.map(m => cloudinary.deleteFromCloudinary(m.publicId));
      await Promise.all(deletePromises);
    }

    await post.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting post',
      error: error.message
    });
  }
};

// @desc    Add reaction to post
// @route   POST /api/posts/:id/reaction
// @access  Private
exports.addReaction = async (req, res) => {
  try {
    const { type } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await post.addReaction(req.user.id, type);

    // Notification
    if (post.user.toString() !== req.user.id) {
      await Notification.createNotification({
        recipient: post.user,
        sender: req.user.id,
        type: 'post-reaction',
        title: 'New reaction on your post',
        message: `${req.user.username} reacted ${type} to your post`,
        relatedPost: post._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Reaction added',
      reactionCount: post.reactionCount,
      userReaction: post.hasUserReacted(req.user.id)
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

// @desc    Remove reaction from post
// @route   DELETE /api/posts/:id/reaction
// @access  Private
exports.removeReaction = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await post.removeReaction(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Reaction removed',
      reactionCount: post.reactionCount
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

// @desc    Share a post
// @route   POST /api/posts/:id/share
// @access  Private
exports.sharePost = async (req, res) => {
  try {
    const { content, visibility } = req.body;
    const originalPost = await Post.findById(req.params.id);

    if (!originalPost) {
      return res.status(404).json({
        success: false,
        message: 'Original post not found'
      });
    }

    const sharedPost = await Post.create({
      user: req.user.id,
      content: content || '',
      visibility: visibility || 'public',
      sharedPost: originalPost._id
    });

    originalPost.shareCount += 1;
    await originalPost.save();

    await sharedPost.populate('user', 'username firstName lastName avatar isVerified');
    await sharedPost.populate({
      path: 'sharedPost',
      populate: { path: 'user', select: 'username firstName lastName avatar isVerified' }
    });

    // Notification
    if (originalPost.user.toString() !== req.user.id) {
      await Notification.createNotification({
        recipient: originalPost.user,
        sender: req.user.id,
        type: 'share',
        title: 'Your post was shared',
        message: `${req.user.username} shared your post`,
        relatedPost: originalPost._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Post shared successfully',
      post: sharedPost
    });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sharing post',
      error: error.message
    });
  }
};

// @desc    Save a post
// @route   POST /api/posts/:id/save
// @access  Private
exports.savePost = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.savedPosts.includes(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Post already saved'
      });
    }

    user.savedPosts.push(req.params.id);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Post saved successfully'
    });
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving post',
      error: error.message
    });
  }
};

// @desc    Unsave a post
// @route   DELETE /api/posts/:id/save
// @access  Private
exports.unsavePost = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.savedPosts = user.savedPosts.filter(id => id.toString() !== req.params.id);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Post unsaved successfully'
    });
  } catch (error) {
    console.error('Unsave post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unsaving post',
      error: error.message
    });
  }
};

// @desc    Get saved posts
// @route   GET /api/posts/saved/all
// @access  Private
exports.getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'savedPosts',
        populate: { path: 'user', select: 'username firstName lastName avatar isVerified' },
        options: { sort: { createdAt: -1 } }
      });

    res.status(200).json({
      success: true,
      count: user.savedPosts.length,
      posts: user.savedPosts
    });
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching saved posts',
      error: error.message
    });
  }
};

// @desc    Pin/Unpin a post
// @route   POST /api/posts/:id/pin
// @access  Private
exports.pinPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    post.isPinned = !post.isPinned;
    await post.save();

    res.status(200).json({
      success: true,
      message: post.isPinned ? 'Post pinned' : 'Post unpinned',
      isPinned: post.isPinned
    });
  } catch (error) {
    console.error('Pin post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error pinning post',
      error: error.message
    });
  }
};

// @desc    Archive/Unarchive a post
// @route   POST /api/posts/:id/archive
// @access  Private
exports.archivePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    post.isArchived = !post.isArchived;
    await post.save();

    res.status(200).json({
      success: true,
      message: post.isArchived ? 'Post archived' : 'Post unarchived',
      isArchived: post.isArchived
    });
  } catch (error) {
    console.error('Archive post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving post',
      error: error.message
    });
  }
};

// @desc    Report a post
// @route   POST /api/posts/:id/report
// @access  Private
exports.reportPost = async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.user.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot report your own post'
      });
    }

    post.reportCount += 1;
    post.isReported = true;
    post.reports = post.reports || [];
    post.reports.push({
      user: req.user.id,
      reason: reason || 'No reason provided',
      reportedAt: new Date()
    });

    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post reported successfully'
    });
  } catch (error) {
    console.error('Report post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reporting post',
      error: error.message
    });
  }
};

// @desc    Increment view count
// @route   POST /api/posts/:id/view
// @access  Private
exports.incrementViewCount = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.status(200).json({
      success: true,
      viewCount: post.viewCount
    });
  } catch (error) {
    console.error('Increment view count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error incrementing view count',
      error: error.message
    });
  }
};
