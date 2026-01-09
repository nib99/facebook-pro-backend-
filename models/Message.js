const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Message must have a sender'],
    index: true
  },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  content: {
    type: String,
    maxlength: [5000, 'Message cannot exceed 5000 characters'],
    trim: true
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'link', 'location', 'sticker', 'gif'],
    default: 'text'
  },
  media: {
    url: String,
    publicId: String,
    thumbnail: String,
    filename: String,
    fileSize: Number,
    mimeType: String,
    duration: Number
  },
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String, maxlength: 10 },
    reactedAt: { type: Date, default: Date.now }
  }],
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  isRead: { type: Boolean, default: false, index: true },
  readAt: Date,
  isDelivered: { type: Boolean, default: false },
  deliveredAt: Date,
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });
messageSchema.index({ createdAt: -1 });

// Virtual
messageSchema.virtual('reactionCount').get(function() { return this.reactions?.length || 0; });

// Methods
messageSchema.methods.markAsRead = async function(userId) {
  if (!this.isRead && this.receiver.toString() === userId.toString()) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return this;
};

messageSchema.methods.markAsDelivered = async function() {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    return this.save();
  }
  return this;
};

messageSchema.methods.addReaction = async function(userId, emoji) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  this.reactions.push({ user: userId, emoji });
  return this.save();
};

messageSchema.methods.removeReaction = async function(userId) {
  this.reactions = this.reactions.filter(r => r.user.toString() !== userId.toString());
  return this.save();
};

messageSchema.methods.editContent = async function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

messageSchema.methods.deleteForUser = async function(userId) {
  if (!this.deletedFor.includes(userId)) this.deletedFor.push(userId);
  return this.save();
};

messageSchema.methods.deleteForEveryone = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = 'This message was deleted';
  return this.save();
};

// Statics
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ receiver: userId, isRead: false, isDeleted: false });
};

messageSchema.statics.markConversationAsRead = function(conversationId, userId) {
  return this.updateMany(
    { conversation: conversationId, receiver: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );
};

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;
