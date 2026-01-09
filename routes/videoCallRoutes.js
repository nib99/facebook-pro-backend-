const express = require('express');
const router = express.Router();
const videoCallController = require('../controllers/videoCallController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/calls/initiate
// @desc    Initiate a video call
// @access  Private
router.post('/initiate', protect, videoCallController.initiateCall);

// @route   PUT /api/calls/:id/answer
// @desc    Answer a call
// @access  Private
router.put('/:id/answer', protect, videoCallController.answerCall);

// @route   PUT /api/calls/:id/reject
// @desc    Reject a call
// @access  Private
router.put('/:id/reject', protect, videoCallController.rejectCall);

// @route   PUT /api/calls/:id/end
// @desc    End a call
// @access  Private
router.put('/:id/end', protect, videoCallController.endCall);

// @route   GET /api/calls/history
// @desc    Get call history
// @access  Private
router.get('/history', protect, videoCallController.getCallHistory);

// @route   GET /api/calls/missed
// @desc    Get missed calls
// @access  Private
router.get('/missed', protect, videoCallController.getMissedCalls);

// @route   GET /api/calls/active
// @desc    Get active calls
// @access  Private
router.get('/active', protect, videoCallController.getActiveCalls);

// @route   GET /api/calls/:id
// @desc    Get call by ID
// @access  Private
router.get('/:id', protect, videoCallController.getCallById);

// @route   PUT /api/calls/:id/quality
// @desc    Update call quality
// @access  Private
router.put('/:id/quality', protect, videoCallController.updateCallQuality);

// @route   GET /api/calls/stats
// @desc    Get call statistics
// @access  Private
router.get('/stats/user', protect, videoCallController.getCallStats);

module.exports = router;
