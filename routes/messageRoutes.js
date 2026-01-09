const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// @route   GET /api/messages/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/conversations', protect, messageController.getConversations);

// @route   GET /api/messages/conversation/:userId
// @desc    Get or create conversation with user
// @access  Private
router.get('/conversation/:userId', protect, messageController.getOrCreateConversation);

// @route   GET /api/messages/conversation/:conversationId/messages
// @desc    Get messages in a conversation
// @access  Private
router.get('/conversation/:conversationId/messages', protect, messageController.getMessages);

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', protect, upload.single('media'), messageController.sendMessage);

// @route   PUT /api/messages/:id
// @desc    Edit a message
// @access  Private
router.put('/:id', protect, messageController.editMessage);

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Private
router.delete('/:id', protect, messageController.deleteMessage);

// @route   PUT /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.put('/:id/read', protect, messageController.markAsRead);

// @route   PUT /api/messages/conversation/:conversationId/read
// @desc    Mark all messages in conversation as read
// @access  Private
router.put('/conversation/:conversationId/read', protect, messageController.markConversationAsRead);

// @route   POST /api/messages/:id/reaction
// @desc    Add reaction to message
// @access  Private
router.post('/:id/reaction', protect, messageController.addReaction);

// @route   DELETE /api/messages/:id/reaction
// @desc    Remove reaction from message
// @access  Private
router.delete('/:id/reaction', protect, messageController.removeReaction);

// @route   GET /api/messages/unread-count
// @desc    Get unread message count
// @access  Private
router.get('/unread-count', protect, messageController.getUnreadCount);

// @route   PUT /api/messages/conversation/:conversationId/mute
// @desc    Mute conversation
// @access  Private
router.put('/conversation/:conversationId/mute', protect, messageController.muteConversation);

// @route   PUT /api/messages/conversation/:conversationId/archive
// @desc    Archive conversation
// @access  Private
router.put('/conversation/:conversationId/archive', protect, messageController.archiveConversation);

// @route   PUT /api/messages/conversation/:conversationId/pin
// @desc    Pin conversation
// @access  Private
router.put('/conversation/:conversationId/pin', protect, messageController.pinConversation);

// @route   POST /api/messages/group
// @desc    Create group conversation
// @access  Private
router.post('/group', protect, messageController.createGroupConversation);

// @route   PUT /api/messages/group/:conversationId/add-member
// @desc    Add member to group
// @access  Private
router.put('/group/:conversationId/add-member', protect, messageController.addGroupMember);

// @route   PUT /api/messages/group/:conversationId/remove-member
// @desc    Remove member from group
// @access  Private
router.put('/group/:conversationId/remove-member', protect, messageController.removeGroupMember);

module.exports = router;
