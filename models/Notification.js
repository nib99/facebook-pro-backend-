const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Notification must have a recipient'],
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Notification must have a sender']
  },
  type: {
    type: String,
    enum: [
      'like', 'comment', 'share', 'mention', 'follow', 'friend-request',
      'friend-accept', 'message', 'video-call', 'live-stream',
      'story-reaction', 'story-reply', 'group-invite', 'event-reminder',
      'post-reaction', 'comment-reply'
    ],
    required: true,
    index: true
  },
  title: { type: String, required: true, maxlength: 200 },
  message: { type: String, maxlength: 500 },
  relatedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  relatedComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  relatedStory: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
  relatedStream: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream' },
  link: String,
  icon: String,
  image: String,
  isRead: { type: Boolean, default: false, index: true },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: { type: Date, index: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return this;
};

// Statics
notificationSchema.statics.createNotification = async function(data) {
  const { recipient, sender, type, title, message, priority = 'medium', expiresIn } = data;
  const notificationData = { recipient, sender, type, title, message, priority };
  if (data.relatedPost) notificationData.relatedPost = data.relatedPost;
  if (data.relatedComment) notificationData.relatedComment = data.relatedComment;
  if (data.relatedUser) notificationData.relatedUser = data.relatedUser;
  if (data.relatedStory) notificationData.relatedStory = data.relatedStory;
  if (data.relatedStream) notificationData.relatedStream = data.relatedStream;
  if (data.link) notificationData.link = data.link;
  if (expiresIn) notificationData.expiresAt = new Date(Date.now() + expiresIn);
  return this.create(notificationData);
};

notificationSchema.statics.getUserNotifications = function(userId, limit = 50, unreadOnly = false) {
  const query = { recipient: userId };
  if (unreadOnly) query.isRead = false;
  return this.find(query)
    .populate('sender', 'username avatar isVerified')
    .populate('relatedPost', 'content')
    .populate('relatedUser', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(limit);
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ recipient: userId, isRead: false });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

notificationSchema.statics.deleteOldNotifications = function(daysOld = 30) {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return this.deleteMany({ createdAt: { $lt: cutoff }, isRead: true });
};

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
