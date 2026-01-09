const Group = require('../models/Group');
const User = require('../models/User');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');

// @desc    Get user's groups
// @route   GET /api/groups/my-groups
// @access  Private
exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user.id
    })
      .populate('creator', 'username avatar')
      .populate('admins', 'username avatar')
      .populate('members', 'username avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: groups.length,
      groups
    });
  } catch (error) {
    console.error('Get my groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching groups',
      error: error.message
    });
  }
};

// @desc    Search groups
// @route   GET /api/groups/search
// @access  Private
exports.searchGroups = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query too short'
      });
    }

    const groups = await Group.searchGroups(q.trim(), 20);

    res.status(200).json({
      success: true,
      count: groups.length,
      groups
    });
  } catch (error) {
    console.error('Search groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching groups',
      error: error.message
    });
  }
};

// @desc    Get group by ID
// @route   GET /api/groups/:id
// @access  Private
exports.getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('creator', 'username firstName lastName avatar')
      .populate('admins', 'username avatar')
      .populate('members', 'username avatar');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some(m => m._id.toString() === req.user.id);
    if (group.privacy === 'secret' && !isMember) {
      return res.status(403).json({
        success: false,
        message: 'This group is secret'
      });
    }

    res.status(200).json({
      success: true,
      group,
      isMember,
      isAdmin: group.admins.some(a => a._id.toString() === req.user.id)
    });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching group',
      error: error.message
    });
  }
};

// @desc    Create group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const { name, description, privacy = 'public', category } = req.body;

    const groupData = {
      name: name.trim(),
      description: description?.trim(),
      creator: req.user.id,
      admins: [req.user.id],
      members: [req.user.id],
      privacy,
      category
    };

    if (req.file) {
      const result = await cloudinary.uploadToCloudinary(req.file.path, 'groups');
      groupData.avatar = result.url;
      groupData.avatarPublicId = result.publicId;
    }

    const group = await Group.create(groupData);
    await group.populate('creator', 'username avatar');

    res.status(201).json({
      success: true,
      message: 'Group created',
      group
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating group',
      error: error.message
    });
  }
};

// @desc    Update group
// @route   PUT /api/groups/:id
// @access  Private (admin only)
exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!group.admins.some(a => a.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const updates = ['name', 'description', 'privacy', 'category', 'rules', 'settings'];
    updates.forEach(field => {
      if (req.body[field] !== undefined) group[field] = req.body[field];
    });

    if (req.file) {
      if (group.avatarPublicId) {
        await cloudinary.deleteFromCloudinary(group.avatarPublicId);
      }
      const result = await cloudinary.uploadToCloudinary(req.file.path, 'groups');
      group.avatar = result.url;
      group.avatarPublicId = result.publicId;
    }

    await group.save();

    res.status(200).json({
      success: true,
      message: 'Group updated',
      group
    });
  } catch (error) {
    console.error('Update group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating group',
      error: error.message
    });
  }
};

// @desc    Delete group
// @route   DELETE /api/groups/:id
// @access  Private (creator only)
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only creator can delete'
      });
    }

    if (group.avatarPublicId) {
      await cloudinary.deleteFromCloudinary(group.avatarPublicId);
    }

    await group.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Group deleted'
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

// @desc    Join group
// @route   POST /api/groups/:id/join
// @access  Private
exports.joinGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group.members.some(m => m.toString() === req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already a member'
      });
    }

    if (group.privacy === 'private') {
      if (group.pendingMembers.includes(req.user.id)) {
        return res.status(400).json({
          success: false,
          message: 'Request pending'
        });
      }
      group.pendingMembers.push(req.user.id);
      await group.save();

      // Notify admins
      const user = await User.findById(req.user.id);
      for (const adminId of group.admins) {
        await Notification.createNotification({
          recipient: adminId,
          sender: req.user.id,
          type: 'group-join-request',
          title: 'New join request',
          message: `${user.username} wants to join ${group.name}`,
          relatedGroup: group._id
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Join request sent'
      });
    }

    await group.addMember(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Joined group'
    });
  } catch (error) {
    console.error('Join group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error joining group',
      error: error.message
    });
  }
};

// @desc    Leave group
// @route   POST /api/groups/:id/leave
// @access  Private
exports.leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group.creator.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Creator cannot leave. Delete group instead.'
      });
    }

    await group.removeMember(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Left group'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Error leaving group',
      error: error.message
    });
  }
};

// @desc    Invite to group
// @route   POST /api/groups/:id/invite
// @access  Private (admin only)
exports.inviteToGroup = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!group.admins.some(a => a.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can invite'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await Notification.createNotification({
      recipient: userId,
      sender: req.user.id,
      type: 'group-invite',
      title: 'Group invitation',
      message: `${req.user.username} invited you to join ${group.name}`,
      relatedGroup: group._id
    });

    res.status(200).json({
      success: true,
      message: 'Invitation sent'
    });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending invite',
      error: error.message
    });
  }
};

// @desc    Remove member
// @route   POST /api/groups/:id/remove-member
// @access  Private (admin only)
exports.removeMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!group.admins.some(a => a.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can remove members'
      });
    }

    await group.removeMember(userId);

    res.status(200).json({
      success: true,
      message: 'Member removed'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing member',
      error: error.message
    });
  }
};

// @desc    Add admin
// @route   POST /api/groups/:id/add-admin
// @access  Private (creator only)
exports.addAdmin = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only creator can add admins'
      });
    }

    await group.addAdmin(userId);

    res.status(200).json({
      success: true,
      message: 'Admin added'
    });
  } catch (error) {
    console.error('Add admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding admin',
      error: error.message
    });
  }
};

// @desc    Remove admin
// @route   POST /api/groups/:id/remove-admin
// @access  Private (creator only)
exports.removeAdmin = async (req, res) => {
  try {
    const { userId } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group.creator.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only creator can remove admins'
      });
    }

    await group.removeAdmin(userId);

    res.status(200).json({
      success: true,
      message: 'Admin removed'
    });
  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing admin',
      error: error.message
    });
  }
};

// @desc    Ban member
// @route   POST /api/groups/:id/ban-member
// @access  Private (admin only)
exports.banMember = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!group.admins.some(a => a.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can ban'
      });
    }

    await group.banMember(userId, req.user.id, reason);

    res.status(200).json({
      success: true,
      message: 'Member banned'
    });
  } catch (error) {
    console.error('Ban member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error banning member',
      error: error.message
    });
  }
};

// @desc    Upload group avatar
// @route   PUT /api/groups/:id/avatar
// @access  Private (admin only)
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (!group.admins.some(a => a.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can change avatar'
      });
    }

    if (group.avatarPublicId) {
      await cloudinary.deleteFromCloudinary(group.avatarPublicId);
    }

    const result = await cloudinary.uploadToCloudinary(req.file.path, 'groups');
    group.avatar = result.url;
    group.avatarPublicId = result.publicId;
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Avatar updated',
      avatar: group.avatar
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

// @desc    Get group members
// @route   GET /api/groups/:id/members
// @access  Private
exports.getGroupMembers = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members', 'username firstName lastName avatar isOnline');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.status(200).json({
      success: true,
      count: group.members.length,
      members: group.members
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching members',
      error: error.message
    });
  }
};

// @desc    Get group posts
// @route   GET /api/groups/:id/posts
// @access  Private
exports.getGroupPosts = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    const isMember = group.members.some(m => m.toString() === req.user.id);
    if (!isMember && group.privacy !== 'public') {
      return res.status(403).json({
        success: false,
        message: 'You must be a member to view posts'
      });
    }

    const posts = await Post.find({ group: req.params.id })
      .populate('user', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error('Get group posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
};
