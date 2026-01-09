const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// @route   GET /api/groups
// @desc    Get all public groups
// @access  Private
router.get('/', protect, groupController.getAllGroups);

// @route   GET /api/groups/my-groups
// @desc    Get user's groups
// @access  Private
router.get('/my-groups', protect, groupController.getMyGroups);

// @route   GET /api/groups/search
// @desc    Search groups
// @access  Private
router.get('/search', protect, groupController.searchGroups);

// @route   GET /api/groups/:id
// @desc    Get group by ID
// @access  Private
router.get('/:id', protect, groupController.getGroupById);

// @route   POST /api/groups
// @desc    Create a group
// @access  Private
router.post('/', protect, groupController.createGroup);

// @route   PUT /api/groups/:id
// @desc    Update group
// @access  Private
router.put('/:id', protect, groupController.updateGroup);

// @route   DELETE /api/groups/:id
// @desc    Delete group
// @access  Private
router.delete('/:id', protect, groupController.deleteGroup);

// @route   POST /api/groups/:id/join
// @desc    Join a group
// @access  Private
router.post('/:id/join', protect, groupController.joinGroup);

// @route   POST /api/groups/:id/leave
// @desc    Leave a group
// @access  Private
router.post('/:id/leave', protect, groupController.leaveGroup);

// @route   POST /api/groups/:id/invite
// @desc    Invite user to group
// @access  Private
router.post('/:id/invite', protect, groupController.inviteToGroup);

// @route   POST /api/groups/:id/remove-member
// @desc    Remove member from group
// @access  Private
router.post('/:id/remove-member', protect, groupController.removeMember);

// @route   POST /api/groups/:id/add-admin
// @desc    Add admin to group
// @access  Private
router.post('/:id/add-admin', protect, groupController.addAdmin);

// @route   POST /api/groups/:id/remove-admin
// @desc    Remove admin from group
// @access  Private
router.post('/:id/remove-admin', protect, groupController.removeAdmin);

// @route   POST /api/groups/:id/ban-member
// @desc    Ban member from group
// @access  Private
router.post('/:id/ban-member', protect, groupController.banMember);

// @route   PUT /api/groups/:id/avatar
// @desc    Upload group avatar
// @access  Private
router.put('/:id/avatar', protect, upload.single('avatar'), groupController.uploadAvatar);

// @route   GET /api/groups/:id/members
// @desc    Get group members
// @access  Private
router.get('/:id/members', protect, groupController.getGroupMembers);

// @route   GET /api/groups/:id/posts
// @desc    Get group posts
// @access  Private
router.get('/:id/posts', protect, groupController.getGroupPosts);

module.exports = router;
