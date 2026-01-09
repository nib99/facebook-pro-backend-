const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

// @desc    Get user's conversations
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
      .populate('participants', 'username firstName lastName avatar isOnline lastSeen')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1 });

    res.status(200).json({
      success: true,
      count: conversations.length,
      conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message
    });
  }
};

// @desc    Get or create conversation with user
// @route   GET /api/messages/conversation/:userId
// @access  Private
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot start conversation with yourself'
      });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, userId], $size: 2 },
      isGroup: false
    })
      .populate('participants', 'username firstName lastName avatar isOnline lastSeen')
      .populate('lastMessage');

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user.id, userId],
        isGroup: false
      });
      await conversation.populate('participants', 'username firstName lastName avatar isOnline lastSeen');
    }

    res.status(200).json({
      success: true,
      conversation
    });
  } catch (error) {
    console.error('Get or create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error handling conversation',
      error: error.message
    });
  }
};

// @desc    Get messages in a conversation
// @route   GET /api/messages/conversation/:conversationId/messages
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!conversation.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'username firstName lastName avatar')
      .populate('replyTo')
      .populate('reactions.user', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Message.countDocuments({ conversation: conversationId });

    res.status(200).json({
      success: true,
      count: messages.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      messages: messages.reverse() // Return in chronological order
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, content, replyTo, messageType = 'text' } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    if (!conversation.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const messageData = {
      conversation: conversationId,
      sender: req.user.id,
      content: content?.trim(),
      messageType,
      replyTo
    };

    // Handle media
    if (req.file) {
      const result = await cloudinary.uploadToCloudinary(req.file.path, 'messages');
      messageData.media = {
        url: result.url,
        publicId: result.publicId,
        type: req.file.mimetype.startsWith('video') ? 'video' : 'image'
      };
      messageData.messageType = messageData.media.type;
    }

    const message = await Message.create(messageData);

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    await message.populate('sender', 'username firstName lastName avatar isVerified');
    if (replyTo) await message.populate('replyTo');

    res.status(201).json({
      success: true,
      message: 'Message sent',
      message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
};

// @desc    Edit a message
// @route   PUT /api/messages/:id
// @access  Private
exports.editMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();
    await message.populate('sender', 'username firstName lastName avatar');

    res.status(200).json({
      success: true,
      message: 'Message edited',
      message
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error editing message',
      error: error.message
    });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:id
// @access  Private
exports.deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Delete media
    if (message.media?.publicId) {
      await cloudinary.deleteFromCloudinary(message.media.publicId);
    }

    await message.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message
    });
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.sender.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark your own message as read'
      });
    }

    await message.markAsRead(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking message as read',
      error: error.message
    });
  }
};

// @desc    Mark conversation as read
// @route   PUT /api/messages/conversation/:conversationId/read
// @access  Private
exports.markConversationAsRead = async (req, res) => {
  try {
    await Message.markConversationAsRead(req.params.conversationId, req.user.id);

    res.status(200).json({
      success: true,
      message: 'Conversation marked as read'
    });
  } catch (error) {
    console.error('Mark conversation as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking conversation as read',
      error: error.message
    });
  }
};

// @desc    Add reaction to message
// @route   POST /api/messages/:id/reaction
// @access  Private
exports.addReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.addReaction(req.user.id, emoji);

    res.status(200).json({
      success: true,
      message: 'Reaction added',
      reactionCount: message.reactionCount
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

// @desc    Remove reaction from message
// @route   DELETE /api/messages/:id/reaction
// @access  Private
exports.removeReaction = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.removeReaction(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Reaction removed',
      reactionCount: message.reactionCount
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

// @desc    Get unread count
// @route   GET /api/messages/unread-count
// @access  Private
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Message.getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message
    });
  }
};

// @desc    Mute/Unmute conversation
// @route   PUT /api/messages/conversation/:conversationId/mute
// @access  Private
exports.muteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    await conversation.mute(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Conversation muted/unmuted',
      isMuted: conversation.mutedBy.includes(req.user.id)
    });
  } catch (error) {
    console.error('Mute conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error muting conversation',
      error: error.message
    });
  }
};

// @desc    Archive/Unarchive conversation
// @route   PUT /api/messages/conversation/:conversationId/archive
// @access  Private
exports.archiveConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    await conversation.archive(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Conversation archived/unarchived',
      isArchived: conversation.archivedBy.includes(req.user.id)
    });
  } catch (error) {
    console.error('Archive conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error archiving conversation',
      error: error.message
    });
  }
};

// @desc    Pin/Unpin conversation
// @route   PUT /api/messages/conversation/:conversationId/pin
// @access  Private
exports.pinConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    await conversation.pin(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Conversation pinned/unpinned',
      isPinned: conversation.pinnedBy.includes(req.user.id)
    });
  } catch (error) {
    console.error('Pin conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error pinning conversation',
      error: error.message
    });
  }
};

// @desc    Create group conversation
// @route   POST /api/messages/group
// @access  Private
exports.createGroupConversation = async (req, res) => {
  try {
    const { groupName, participants } = req.body;

    if (!participants || participants.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Group must have at least 2 participants'
      });
    }

    const allParticipants = [...new Set([req.user.id, ...participants])];

    const conversation = await Conversation.create({
      participants: allParticipants,
      isGroup: true,
      groupName,
      groupAdmin: req.user.id
    });

    await conversation.populate('participants', 'username firstName lastName avatar isOnline');

    res.status(201).json({
      success: true,
      message: 'Group created',
      conversation
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

// @desc    Add member to group
// @route   PUT /api/messages/group/:conversationId/add-member
// @access  Private
exports.addGroupMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (conversation.groupAdmin.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can add members'
      });
    }

    await conversation.addParticipant(userId);

    res.status(200).json({
      success: true,
      message: 'Member added'
    });
  } catch (error) {
    console.error('Add group member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding member',
      error: error.message
    });
  }
};

// @desc    Remove member from group
// @route   PUT /api/messages/group/:conversationId/remove-member
// @access  Private
exports.removeGroupMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (conversation.groupAdmin.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only admin can remove members'
      });
    }

    await conversation.removeParticipant(userId);

    res.status(200).json({
      success: true,
      message: 'Member removed'
    });
  } catch (error) {
    console.error('Remove group member error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing member',
      error: error.message
    });
  }
};
