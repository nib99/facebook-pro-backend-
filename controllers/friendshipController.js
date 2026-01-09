const Friendship = require('../models/Friendship');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get pending friend requests
// @route   GET /api/friendships/requests
// @access  Private
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await Friendship.getPendingRequests(req.user.id);

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching requests',
      error: error.message
    });
  }
};

// @desc    Get sent friend requests
// @route   GET /api/friendships/sent
// @access  Private
exports.getSentRequests = async (req, res) => {
  try {
    const requests = await Friendship.getSentRequests(req.user.id);

    res.status(200).json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching sent requests',
      error: error.message
    });
  }
};

// @desc    Send friend request
// @route   POST /api/friendships/request/:userId
// @access  Private
exports.sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    const friendship = await Friendship.sendRequest(req.user.id, userId);

    // Notification
    await Notification.createNotification({
      recipient: userId,
      sender: req.user.id,
      type: 'friend-request',
      title: 'New friend request',
      message: `${req.user.username} sent you a friend request`,
      relatedUser: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Friend request sent',
      friendship
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Accept friend request
// @route   PUT /api/friendships/accept/:requestId
// @access  Private
exports.acceptFriendRequest = async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.requestId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    await friendship.accept();

    // Notification
    await Notification.createNotification({
      recipient: friendship.requester,
      sender: req.user.id,
      type: 'friend-accept',
      title: 'Friend request accepted',
      message: `${req.user.username} accepted your friend request`,
      relatedUser: req.user.id
    });

    res.status(200).json({
      success: true,
      message: 'Friend request accepted'
    });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reject friend request
// @route   PUT /api/friendships/reject/:requestId
// @access  Private
exports.rejectFriendRequest = async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.requestId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    await friendship.reject();

    res.status(200).json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel sent friend request
// @route   DELETE /api/friendships/cancel/:requestId
// @access  Private
exports.cancelFriendRequest = async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.requestId);

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }

    await friendship.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Friend request cancelled'
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Unfriend a user
// @route   DELETE /api/friendships/unfriend/:userId
// @access  Private
exports.unfriend = async (req, res) => {
  try {
    const friendship = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: req.params.userId },
        { requester: req.params.userId, recipient: req.user.id }
      ],
      status: 'accepted'
    });

    if (!friendship) {
      return res.status(400).json({
        success: false,
        message: 'Not friends'
      });
    }

    await friendship.unfriend();

    res.status(200).json({
      success: true,
      message: 'Unfriended successfully'
    });
  } catch (error) {
    console.error('Unfriend error:', error);
    res.status(500).json({
      success: false,
      message: 'Error unfriending',
      error: error.message
    });
  }
};

// @desc    Check friendship status
// @route   GET /api/friendships/status/:userId
// @access  Private
exports.checkFriendshipStatus = async (req, res) => {
  try {
    const status = await Friendship.checkStatus(req.user.id, req.params.userId);

    res.status(200).json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Check status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking status',
      error: error.message
    });
  }
};
