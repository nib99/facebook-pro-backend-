const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: { type: String, maxlength: [500, 'Description cannot exceed 500 characters'], trim: true },
  avatar: { type: String, default: '' },
  coverPhoto: { type: String, default: '' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pendingMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bannedMembers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bannedAt: Date,
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String
  }],
  privacy: {
    type: String,
    enum: ['public', 'private', 'secret'],
    default: 'public',
    index: true
  },
  visibility: { type: String, enum: ['visible', 'hidden'], default: 'visible' },
  memberCount: { type: Number, default: 0 },
  postCount: { type: Number, default: 0 },
  category: {
    type: String,
    enum: ['general', 'technology', 'sports', 'gaming', 'music', 'education', 'business', 'entertainment', 'other'],
    default: 'general'
  },
  tags: [{ type: String, trim: true, lowercase: true }],
  rules: [{ title: String, description: String }],
  settings: {
    memberCanPost: { type: Boolean, default: true },
    postApproval: { type: Boolean, default: false },
    memberCanInvite: { type: Boolean, default: true }
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
groupSchema.index({ name: 'text', description: 'text' });
groupSchema.index({ creator: 1 });
groupSchema.index({ members: 1 });
groupSchema.index({ privacy: 1, isActive: 1 });
groupSchema.index({ category: 1 });

// Virtual
groupSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'group'
});

// Methods
groupSchema.methods.addMember = async function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    this.memberCount += 1;
    this.pendingMembers = this.pendingMembers.filter(id => id.toString() !== userId.toString());
    return this.save();
  }
  return this;
};

groupSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(id => id.toString() !== userId.toString());
  if (this.memberCount > 0) this.memberCount -= 1;
  return this.save();
};

groupSchema.methods.addAdmin = async function(userId) {
  if (!this.admins.includes(userId)) this.admins.push(userId);
  return this.save();
};

groupSchema.methods.removeAdmin = async function(userId) {
  this.admins = this.admins.filter(id => id.toString() !== userId.toString());
  return this.save();
};

groupSchema.methods.banMember = async function(userId, bannedBy, reason = '') {
  await this.removeMember(userId);
  this.bannedMembers.push({ user: userId, bannedAt: new Date(), bannedBy, reason });
  return this.save();
};

groupSchema.methods.isAdmin = function(userId) {
  return this.admins.some(id => id.toString() === userId.toString()) ||
         this.creator.toString() === userId.toString();
};

groupSchema.methods.isMember = function(userId) {
  return this.members.some(id => id.toString() === userId.toString());
};

groupSchema.methods.isBanned = function(userId) {
  return this.bannedMembers.some(b => b.user.toString() === userId.toString());
};

// Static
groupSchema.statics.searchGroups = function(searchQuery, limit = 20) {
  return this.find({
    $text: { $search: searchQuery },
    privacy: 'public',
    isActive: true
  })
  .select('name description avatar memberCount category')
  .limit(limit);
};

const Group = mongoose.model('Group', groupSchema);
module.exports = Group;
