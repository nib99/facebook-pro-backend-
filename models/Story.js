const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Story must belong to a user'],
    index: true
  },
  media: {
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    publicId: String,
    thumbnail: String,
    duration: Number // For videos
  },
  caption: {
    type: String,
    maxlength: [200, 'Caption cannot exceed 200 characters'],
    trim: true
  },
  backgroundColor: {
    type: String,
    default: '#000000'
  },
  textColor: {
    type: String,
    default: '#ffffff'
  },
  visibility: {
    type: String,
    enum: ['public', 'friends', 'close-friends', 'custom'],
    default: 'friends'
  },
  viewers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    viewedAt: { type: Date, default: Date.now }
  }],
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['like', 'love', 'haha', 'wow'], default: 'like' },
    reactedAt: { type: Date, default: Date.now }
  }],
  replies: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, maxlength: 500 },
    repliedAt: { type: Date, default: Date.now }
  }],
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  location: {
    name: String,
    coordinates: { latitude: Number, longitude: Number }
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: true
  },
  isActive: { type: Boolean, default: true, index: true },
  isHighlighted: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
storySchema.index({ user: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ isActive: 1, expiresAt: 1 });

// Virtuals
storySchema.virtual('viewerCount').get(function() { return this.viewers?.length || 0; });
storySchema.virtual('reactionCount').get(function() { return this.reactions?.length || 0; });
storySchema.virtual('replyCount').get(function() { return this.replies?.length || 0; });
storySchema.virtual('isExpired').get(function() { return this.expiresAt < new Date(); });

// Methods
storySchema.methods.addViewer = async function(userId) {
  const hasViewed = this.viewers.some(v => v.user.toString() === userId.toString());
  if (!hasViewed) {
    this.viewers.push({ user: userId });
  }
  return this.save();
};

storySchema.methods.addReaction = async function(userId, reactionType = 'like') {
  const valid = ['like', 'love', 'haha', 'wow'];
  if (!valid.includes(reactionType)) throw new Error('Invalid reaction type');

  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  this.reactions.push({ user: userId, type: reactionType });
  return this.save();
};

storySchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  return this.save();
};

storySchema.methods.addReply = async function(userId, content) {
  this.replies.push({ user: userId, content });
  if (this.replies.length > 100) this.replies = this.replies.slice(-100);
  return this.save();
};

storySchema.methods.hasUserViewed = function(userId) {
  return this.viewers.some(v => v.user.toString() === userId.toString());
};

// Statics
storySchema.statics.getFriendStories = async function(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId).populate('friends');
  if (!user) throw new Error('User not found');
  const friendIds = user.friends.map(f => f._id);
  return this.find({
    user: { $in: friendIds },
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
  .populate('user', 'username avatar isVerified')
  .sort({ createdAt: -1 });
};

storySchema.statics.getUserStories = function(userId) {
  return this.find({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  })
  .sort({ createdAt: -1 });
};

storySchema.statics.getStoryById = async function(storyId, viewerId) {
  const story = await this.findById(storyId)
    .populate('user', 'username avatar isVerified')
    .populate('viewers.user', 'username avatar')
    .populate('reactions.user', 'username avatar')
    .populate('replies.user', 'username avatar');
  if (!story) throw new Error('Story not found');
  if (story.isExpired) throw new Error('Story has expired');
  if (viewerId && story.user._id.toString() !== viewerId.toString()) {
    await story.addViewer(viewerId);
  }
  return story;
};

storySchema.statics.deactivateExpiredStories = async function() {
  return this.updateMany(
    { isActive: true, expiresAt: { $lt: new Date() } },
    { $set: { isActive: false } }
  );
};

const Story = mongoose.model('Story', storySchema);
module.exports = Story;
