const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find({ isBlocked: false })
      .select('username firstName lastName avatar isVerified isOnline createdAt')
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments({ isBlocked: false });

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const regex = new RegExp(q.trim(), 'i');

    const users = await User.find({
      $or: [
        { username: regex },
        { firstName: regex },
        { lastName: regex }
      ],
      _id: { $ne: req.user.id },
      isBlocked: false
    })
    .select('username firstName lastName avatar isVerified isOnline')
    .limit(20);

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching users',
      error: error.message
    });
  }
};

// @desc    Get suggested friends
// @route   GET /api/users/suggested
// @access  Private
exports.getSuggestedFriends = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const excludedIds = [
      req.user.id,
      ...currentUser.friends.map(f => f.toString()),
      ...currentUser.following.map(f => f.toString()),
      ...currentUser.blockedUsers.map(b => b.toString())
    ];

    const suggested = await User.find({
      _id: { $nin: excludedIds },
      isBlocked: false
    })
    .select('username firstName lastName avatar isVerified')
    .limit(10)
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: suggested.length,
      users: suggested
    });
  } catch (error) {
    console.error('Get suggested friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suggested friends',
      error: error.message
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('friends', 'username avatar isOnline isVerified')
      .select('-password -blockedUsers');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Privacy check
    if (user.settings?.privacy?.profileVisibility === 'private' && 
        req.user.id !== user._id.toString() &&
        !user.friends.some(f => f._id.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'This profile is private'
      });
    }

    res.status(200).json({
      success: true,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'bio', 'location', 'dateOfBirth',
      'gender', 'phone', 'website', 'interests', 'work', 'education'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// @desc    Upload/Update avatar
// @route   PUT /api/users/avatar
// @access  Private
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old avatar if exists
    if (user.avatar) {
      const publicId = user.avatar.split('/').pop().split('.')[0];
      try {
        await cloudinary.deleteFromCloudinary(`avatars/${publicId}`);
      } catch (err) {
        console.error('Error deleting old avatar:', err);
      }
    }

    // Upload new avatar
    const result = await cloudinary.uploadToCloudinary(req.file.path, 'avatars');

    user.avatar = result.url;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading avatar',
      error: error.message
    });
  }
};

// @desc    Upload/Update cover photo
// @route   PUT /api/users/cover-photo
// @access  Private
exports.uploadCoverPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete old cover if exists
    if (user.coverPhoto) {
      const publicId = user.coverPhoto.split('/').pop().split('.')[0];
      try {
        await cloudinary.deleteFromCloudinary(`covers/${publicId}`);
      } catch (err) {
        console.error('Error deleting old cover:', err);
      }
    }

    // Upload new cover
    const result = await cloudinary.uploadToCloudinary(req.file.path, 'covers');

    user.coverPhoto = result.url;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Cover photo uploaded successfully',
      coverPhoto: user.coverPhoto
    });
  } catch (error) {
    console.error('Upload cover photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading cover photo',
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.id !== req.params.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this user'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

// @desc    Get user's friends
// @route   GET /api/users/:id/friends
// @access  Private
exports.getUserFriends = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('friends', 'username firstName lastName avatar isOnline isVerified');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      count: user.friends.length,
      friends: user.friends
    });
  } catch (error) {
    console.error('Get user friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching friends',
      error: error.message
    });
  }
};

// @desc    Follow a user
// @route   POST /api/users/:id/follow
// @access  Private
exports.followUser = async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot follow yourself'
      });
    }

    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (currentUser.following.includes(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already following this user'
      });
    }

    currentUser.following.push(req.params.id);
    userToFollow.followers.push(req.user.id);

    await Promise.all([currentUser.save(), userToFollow.save()]);

    res.status(200).json({
      success: true,
      message: 'User followed successfully'
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error following user',
      error: error.message
    });
  }
};

// @desc    Unfollow a user
// @route   POST /api/users/:id/unfollow
// @access  Private
exports.unfollowUser = async (req, res) => {
  try {
    const userToUnfollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToUnfollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
    userToUnfollow.followers = userToUnfollow.followers.filter(id => id.toString() !== req.user.id);

    await Promise.all([currentUser.save(), userToUnfollow.save()]);

    res.status(200).json({
      success: true,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unfollowing user',
      error: error.message
    });
  }
};

// @desc    Block a user
// @route   POST /api/users/:id/block
// @access  Private
exports.blockUser = async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    const currentUser = await User.findById(req.user.id);

    if (currentUser.blockedUsers.includes(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'User already blocked'
      });
    }

    currentUser.blockedUsers.push(req.params.id);

    // Remove any friendship/follow relations
    currentUser.friends = currentUser.friends.filter(id => id.toString() !== req.params.id);
    currentUser.following = currentUser.following.filter(id => id.toString() !== req.params.id);
    currentUser.followers = currentUser.followers.filter(id => id.toString() !== req.params.id);

    await currentUser.save();

    res.status(200).json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error blocking user',
      error: error.message
    });
  }
};

// @desc    Unblock a user
// @route   POST /api/users/:id/unblock
// @access  Private
exports.unblockUser = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    if (!currentUser.blockedUsers.includes(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'User is not blocked'
      });
    }

    currentUser.blockedUsers = currentUser.blockedUsers.filter(id => id.toString() !== req.params.id);
    await currentUser.save();

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unblocking user',
      error: error.message
    });
  }
};

// @desc    Update user settings
// @route   PUT /api/users/settings
// @access  Private
exports.updateSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.body.privacy) {
      user.settings.privacy = { ...user.settings.privacy, ...req.body.privacy };
    }
    if (req.body.notifications) {
      user.settings.notifications = { ...user.settings.notifications, ...req.body.notifications };
    }
    if (req.body.theme) user.settings.theme = req.body.theme;
    if (req.body.language) user.settings.language = req.body.language;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings: user.settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating settings',
      error: error.message
    });
  }
};

// @desc    Update online status
// @route   PUT /api/users/online-status
// @access  Private
exports.updateOnlineStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['online', 'away', 'busy', 'offline'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.onlineStatus = status;
    user.isOnline = status !== 'offline';
    user.lastSeen = Date.now();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Online status updated',
      onlineStatus: user.onlineStatus
    });
  } catch (error) {
    console.error('Update online status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating status',
      error: error.message
    });
  }
};
