const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  isGroup: { type: Boolean, default: false },
  groupName: { type: String, trim: true, maxlength: [100, 'Group name cannot exceed 100 characters'] },
  groupAvatar: String,
  groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  unreadCount: { type: Map, of: Number, default: {} },
  mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pinnedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ isGroup: 1 });

// Virtual
conversationSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'conversation'
});

// Methods
conversationSchema.methods.getUnreadCount = function(userId) {
  return this.unreadCount.get(userId.toString()) || 0;
};

conversationSchema.methods.incrementUnreadCount = async function(userId) {
  const count = this.getUnreadCount(userId);
  this.unreadCount.set(userId.toString(), count + 1);
  return this.save();
};

conversationSchema.methods.resetUnreadCount = async function(userId) {
  this.unreadCount.set(userId.toString(), 0);
  return this.save();
};

conversationSchema.methods.updateLastMessage = async function(messageId) {
  this.lastMessage = messageId;
  this.lastMessageAt = new Date();
  return this.save();
};

conversationSchema.methods.addParticipant = async function(userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    this.unreadCount.set(userId.toString(), 0);
    return this.save();
  }
  return this;
};

conversationSchema.methods.removeParticipant = async function(userId) {
  this.participants = this.participants.filter(id => id.toString() !== userId.toString());
  this.unreadCount.delete(userId.toString());
  return this.save();
};

conversationSchema.methods.mute = async function(userId) {
  if (!this.mutedBy.includes(userId)) this.mutedBy.push(userId);
  return this.save();
};

conversationSchema.methods.unmute = async function(userId) {
  this.mutedBy = this.mutedBy.filter(id => id.toString() !== userId.toString());
  return this.save();
};

conversationSchema.methods.archive = async function(userId) {
  if (!this.archivedBy.includes(userId)) this.archivedBy.push(userId);
  return this.save();
};

conversationSchema.methods.unarchive = async function(userId) {
  this.archivedBy = this.archivedBy.filter(id => id.toString() !== userId.toString());
  return this.save();
};

conversationSchema.methods.pin = async function(userId) {
  if (!this.pinnedBy.includes(userId)) this.pinnedBy.push(userId);
  return this.save();
};

conversationSchema.methods.unpin = async function(userId) {
  this.pinnedBy = this.pinnedBy.filter(id => id.toString() !== userId.toString());
  return this.save();
};

// Statics
conversationSchema.statics.findOrCreate = async function(participant1, participant2) {
  let conversation = await this.findOne({
    isGroup: false,
    participants: { $all: [participant1, participant2], $size: 2 }
  });
  if (!conversation) {
    conversation = await this.create({ participants: [participant1, participant2], isGroup: false });
  }
  return conversation;
};

conversationSchema.statics.getUserConversations = function(userId, includeArchived = false) {
  const query = { participants: userId };
  if (!includeArchived) query.archivedBy = { $ne: userId };
  return this.find(query)
    .populate('participants', 'username avatar isOnline lastSeen')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });
};

const Conversation = mongoose.model('Conversation', conversationSchema);
module.exports = Conversation;
