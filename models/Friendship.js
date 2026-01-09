const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'blocked'],
    default: 'pending',
    index: true
  },
  acceptedAt: Date,
  rejectedAt: Date,
  blockedAt: Date
}, {
  timestamps: true
});

// Indexes
friendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });
friendshipSchema.index({ status: 1, createdAt: -1 });

// Methods
friendshipSchema.methods.accept = async function() {
  if (this.status !== 'pending') throw new Error('Only pending requests can be accepted');
  this.status = 'accepted';
  this.acceptedAt = new Date();
  const User = mongoose.model('User');
  await Promise.all([
    User.findByIdAndUpdate(this.requester, { $addToSet: { friends: this.recipient } }),
    User.findByIdAndUpdate(this.recipient, { $addToSet: { friends: this.requester } })
  ]);
  return this.save();
};

friendshipSchema.methods.reject = async function() {
  if (this.status !== 'pending') throw new Error('Only pending requests can be rejected');
  this.status = 'rejected';
  this.rejectedAt = new Date();
  return this.save();
};

friendshipSchema.methods.block = async function(blockerId) {
  this.status = 'blocked';
  this.blockedAt = new Date();
  const User = mongoose.model('User');
  const blockedUser = blockerId.toString() === this.requester.toString() ? this.recipient : this.requester;
  await User.findByIdAndUpdate(blockerId, { $addToSet: { blockedUsers: blockedUser } });
  return this.save();
};

friendshipSchema.methods.unfriend = async function() {
  const User = mongoose.model('User');
  await Promise.all([
    User.findByIdAndUpdate(this.requester, { $pull: { friends: this.recipient } }),
    User.findByIdAndUpdate(this.recipient, { $pull: { friends: this.requester } })
  ]);
  return this.deleteOne();
};

// Statics
friendshipSchema.statics.sendRequest = async function(requesterId, recipientId) {
  const existing = await this.findOne({
    $or: [
      { requester: requesterId, recipient: recipientId },
      { requester: recipientId, recipient: requesterId }
    ]
  });
  if (existing) {
    if (existing.status === 'pending') throw new Error('Friend request already sent');
    if (existing.status === 'accepted') throw new Error('Already friends');
    if (existing.status === 'blocked') throw new Error('Cannot send friend request');
  }
  return this.create({ requester: requesterId, recipient: recipientId, status: 'pending' });
};

friendshipSchema.statics.getPendingRequests = function(userId) {
  return this.find({ recipient: userId, status: 'pending' })
    .populate('requester', 'username avatar isVerified')
    .sort({ createdAt: -1 });
};

friendshipSchema.statics.getSentRequests = function(userId) {
  return this.find({ requester: userId, status: 'pending' })
    .populate('recipient', 'username avatar isVerified')
    .sort({ createdAt: -1 });
};

friendshipSchema.statics.checkStatus = async function(user1Id, user2Id) {
  const friendship = await this.findOne({
    $or: [
      { requester: user1Id, recipient: user2Id },
      { requester: user2Id, recipient: user1Id }
    ]
  });
  return friendship ? friendship.status : 'none';
};

const Friendship = mongoose.model('Friendship', friendshipSchema);
module.exports = Friendship;
