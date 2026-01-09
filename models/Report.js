const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reportedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  reportedComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  reportType: {
    type: String,
    enum: ['user', 'post', 'comment', 'group', 'message'],
    required: true
  },
  reason: {
    type: String,
    enum: [
      'spam',
      'harassment',
      'hate-speech',
      'violence',
      'nudity',
      'false-information',
      'intellectual-property',
      'other'
    ],
    required: true
  },
  description: {
    type: String,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  action: {
    type: String,
    enum: ['no-action', 'warning', 'content-removed', 'user-suspended', 'user-banned']
  }
}, {
  timestamps: true
});

// Indexes
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ reportedUser: 1 });
reportSchema.index({ reportedPost: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', reportSchema);
