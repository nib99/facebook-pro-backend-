const User = require('../models/User');
const Post = require('../models/Post');
const Group = require('../models/Group');
const Report = require('../models/Report');
const Notification = require('../models/Notification');

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalPosts,
      totalGroups,
      pendingReports,
      newUsersToday
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isOnline: true }),
      Post.countDocuments(),
      Group.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    // Get user growth data (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const userGrowth = await User.aggregate([
      {
        $match: { createdAt: { $gte: thirtyDaysAgo } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get post activity data (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const postActivity = await Post.aggregate([
      {
        $match: { createdAt: { $gte: sevenDaysAgo } }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalPosts,
        totalGroups,
        pendingReports,
        newUsersToday,
        userGrowth,
        postActivity
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// @desc    Get all users with pagination
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status; // active, deactivated, all

    let query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'deactivated') {
      query.isActive = false;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await User.countDocuments(query);

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

// @desc    Get user details
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('friends', 'username avatar')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const [postCount, reportCount] = await Promise.all([
      Post.countDocuments({ author: user._id }),
      Report.countDocuments({ reportedUser: user._id })
    ]);

    res.status(200).json({
      success: true,
      user,
      statistics: {
        postCount,
        reportCount,
        friendsCount: user.friends.length,
        followersCount: user.followers.length,
        followingCount: user.following.length
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details',
      error: error.message
    });
  }
};

// @desc    Suspend user
// @route   PUT /api/admin/users/:id/suspend
// @access  Private/Admin
exports.suspendUser = async (req, res) => {
  try {
    const { reason, duration } = req.body; // duration in days

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot suspend admin users'
      });
    }

    user.isActive = false;
    user.suspendedUntil = duration 
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : null;
    user.suspensionReason = reason;

    await user.save();

    // Notify user
    await Notification.createNotification({
      recipient: user._id,
      type: 'account-suspended',
      title: 'Account Suspended',
      message: `Your account has been suspended. Reason: ${reason}`,
      sender: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      user
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error suspending user',
      error: error.message
    });
  }
};

// @desc    Unsuspend user
// @route   PUT /api/admin/users/:id/unsuspend
// @access  Private/Admin
exports.unsuspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = true;
    user.suspendedUntil = null;
    user.suspensionReason = null;

    await user.save();

    // Notify user
    await Notification.createNotification({
      recipient: user._id,
      type: 'account-activated',
      title: 'Account Activated',
      message: 'Your account has been reactivated',
      sender: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'User unsuspended successfully',
      user
    });
  } catch (error) {
    console.error('Unsuspend user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unsuspending user',
      error: error.message
    });
  }
};

// @desc    Delete user permanently
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Delete user's posts
    await Post.deleteMany({ author: user._id });

    // Delete user
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

// @desc    Get all posts with pagination
// @route   GET /api/admin/posts
// @access  Private/Admin
exports.getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Post.countDocuments();

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      posts
    });
  } catch (error) {
    console.error('Get all posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/admin/posts/:id
// @access  Private/Admin
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await post.deleteOne();

    // Notify post author
    await Notification.createNotification({
      recipient: post.author,
      type: 'post-removed',
      title: 'Post Removed',
      message: 'Your post has been removed by an administrator',
      sender: req.user.id
    });

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

// @desc    Get all reports
// @route   GET /api/admin/reports
// @access  Private/Admin
exports.getAllReports = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'pending';

    const query = status === 'all' ? {} : { status };

    const reports = await Report.find(query)
      .populate('reporter', 'username avatar')
      .populate('reportedUser', 'username avatar')
      .populate('reportedPost')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Report.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reports.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      reports
    });
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
};

// @desc    Update report status
// @route   PUT /api/admin/reports/:id
// @access  Private/Admin
exports.updateReportStatus = async (req, res) => {
  try {
    const { status, action } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.status = status;
    report.reviewedBy = req.user.id;
    report.reviewedAt = Date.now();

    if (action) {
      report.action = action;
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report updated successfully',
      report
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating report',
      error: error.message
    });
  }
};

// @desc    Get all groups
// @route   GET /api/admin/groups
// @access  Private/Admin
exports.getAllGroups = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const groups = await Group.find()
      .populate('creator', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Group.countDocuments();

    res.status(200).json({
      success: true,
      count: groups.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      groups
    });
  } catch (error) {
    console.error('Get all groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching groups',
      error: error.message
    });
  }
};

// @desc    Delete group
// @route   DELETE /api/admin/groups/:id
// @access  Private/Admin
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    await group.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting group',
      error: error.message
    });
  }
};

// @desc    Verify user account
// @route   PUT /api/admin/users/:id/verify
// @access  Private/Admin
exports.verifyUserAccount = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isVerified = true;
    await user.save();

    // Notify user
    await Notification.createNotification({
      recipient: user._id,
      type: 'account-verified',
      title: 'Account Verified',
      message: 'Congratulations! Your account has been verified',
      sender: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'User verified successfully',
      user
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying user',
      error: error.message
    });
  }
};

// @desc    Send broadcast notification
// @route   POST /api/admin/broadcast
// @access  Private/Admin
exports.sendBroadcast = async (req, res) => {
  try {
    const { title, message, targetUsers } = req.body;

    let recipients;

    if (targetUsers === 'all') {
      recipients = await User.find({ isActive: true }).select('_id');
    } else if (Array.isArray(targetUsers)) {
      recipients = targetUsers.map(id => ({ _id: id }));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid target users'
      });
    }

    const notifications = recipients.map(user => ({
      recipient: user._id,
      sender: req.user.id,
      type: 'announcement',
      title,
      message
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({
      success: true,
      message: `Broadcast sent to ${recipients.length} users`
    });
  } catch (error) {
    console.error('Send broadcast error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending broadcast',
      error: error.message
    });
  }
};
