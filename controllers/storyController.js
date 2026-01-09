const Story = require('../models/Story');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

// @desc    Get stories feed (from friends + own)
// @route   GET /api/stories
// @access  Private
exports.getStoriesFeed = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const friendIds = [...user.friends.map(f => f._id), req.user.id];

    const stories = await Story.find({
      user: { $in: friendIds },
      expiresAt: { $gt: new Date() },
      isActive: true
    })
      .populate('user', 'username firstName lastName avatar isVerified')
      .populate('viewers.user', 'username avatar')
      .populate('reactions.user', 'username avatar')
      .sort({ createdAt: -1 });

    // Group by user
    const grouped = stories.reduce((acc, story) => {
      const key = story.user._id.toString();
      if (!acc[key]) {
        acc[key] = { user: story.user, stories: [] };
      }
      acc[key].stories.push(story);
      return acc;
    }, {});

    const storyGroups = Object.values(grouped);

    res.status(200).json({
      success: true,
      count: storyGroups.length,
      storyGroups
    });
  } catch (error) {
    console.error('Get stories feed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stories',
      error: error.message
    });
  }
};

// @desc    Get user's own stories
// @route   GET /api/stories/user/:userId
// @access  Private
exports.getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;

    const stories = await Story.getUserStories(userId);

    res.status(200).json({
      success: true,
      count: stories.length,
      stories
    });
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching stories',
      error: error.message
    });
  }
};

// @desc    Get single story by ID
// @route   GET /api/stories/:id
// @access  Private
exports.getStoryById = async (req, res) => {
  try {
    const story = await Story.getStoryById(req.params.id, req.user.id);

    res.status(200).json({
      success: true,
      story
    });
  } catch (error) {
    console.error('Get story by ID error:', error);
    res.status(error.message.includes('expired') ? 410 : 404).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create a story
// @route   POST /api/stories
// @access  Private
exports.createStory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Media file is required'
      });
    }

    const result = await cloudinary.uploadToCloudinary(req.file.path, 'stories');

    const storyData = {
      user: req.user.id,
      media: {
        type: req.file.mimetype.startsWith('video') ? 'video' : 'image',
        url: result.url,
        publicId: result.publicId
      }
    };

    if (req.body.caption) storyData.caption = req.body.caption;

    const story = await Story.create(storyData);
    await story.populate('user', 'username firstName lastName avatar isVerified');

    res.status(201).json({
      success: true,
      message: 'Story created',
      story
    });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating story',
      error: error.message
    });
  }
};

// @desc    Delete a story
// @route   DELETE /api/stories/:id
// @access  Private
exports.deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    if (story.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (story.media.publicId) {
      await cloudinary.deleteFromCloudinary(story.media.publicId);
    }

    await story.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Story deleted'
    });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting story',
      error: error.message
    });
  }
};

// @desc    View a story
// @route   POST /api/stories/:id/view
// @access  Private
exports.viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    await story.addViewer(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Story viewed',
      viewerCount: story.viewerCount
    });
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({
      success: false,
      message: 'Error viewing story',
      error: error.message
    });
  }
};

// @desc    Add reaction to story
// @route   POST /api/stories/:id/reaction
// @access  Private
exports.addReaction = async (req, res) => {
  try {
    const { type } = req.body;
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    await story.addReaction(req.user.id, type);

    res.status(200).json({
      success: true,
      message: 'Reaction added',
      reactionCount: story.reactionCount
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

// @desc    Remove reaction from story
// @route   DELETE /api/stories/:id/reaction
// @access  Private
exports.removeReaction = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    await story.removeReaction(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Reaction removed',
      reactionCount: story.reactionCount
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

// @desc    Get story viewers
// @route   GET /api/stories/:id/viewers
// @access  Private (owner only)
exports.getStoryViewers = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id)
      .populate('viewers.user', 'username firstName lastName avatar');

    if (!story) {
      return res.status(404).json({
        success: false,
        message: 'Story not found'
      });
    }

    if (story.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    res.status(200).json({
      success: true,
      count: story.viewers.length,
      viewers: story.viewers
    });
  } catch (error) {
    console.error('Get story viewers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching viewers',
      error: error.message
    });
  }
};
