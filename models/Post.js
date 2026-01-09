const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Post must belong to a user'],
    index: true
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    maxlength: [5000, 'Post content cannot exceed 5000 characters'],
    trim: true
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video', 'gif'],
      default: 'image'
    },
    url: {
      type: String,
      required: true
    },
    publicId: String,
    thumbnail: String,
    width: Number,
    height: Number,
    duration: Number // For videos
  }],
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  reactions: {
    like: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    love: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    haha: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    wow: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sad: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    angry: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  location: {
    name: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  feeling: { type: String, trim: true },
  activity: { type: String, trim: true },
  commentCount: { type: Number, default: 0 },
  shareCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  sharedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  isPinned: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  reportCount: { type: Number, default: 0 },
  isReported: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ 'reactions.like': 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ isPinned: 1, createdAt: -1 });

// Virtuals
postSchema.virtual('reactionCount').get(function() {
  return (
    (this.reactions.like?.length || 0) +
    (this.reactions.love?.length || 0) +
    (this.reactions.haha?.length || 0) +
    (this.reactions.wow?.length || 0) +
    (this.reactions.sad?.length || 0) +
    (this.reactions.angry?.length || 0)
  );
});

postSchema.virtual('engagementRate').get(function() {
  const total = this.reactionCount + this.commentCount + this.shareCount;
  return this.viewCount > 0 ? (total / this.viewCount) * 100 : 0;
});

postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post'
});

// Pre-save: extract hashtags
postSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const hashtagRegex = /#(\w+)/g;
    const hashtags = [];
    let match;
    while ((match = hashtagRegex.exec(this.content)) !== null) {
      hashtags.push(match[1].toLowerCase());
    }
    this.hashtags = [...new Set(hashtags)];
  }
  next();
});

// Instance methods
postSchema.methods.addReaction = async function(userId, reactionType) {
  const validReactions = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
  if (!validReactions.includes(reactionType)) throw new Error('Invalid reaction type');

  validReactions.forEach(type => {
    this.reactions[type] = this.reactions[type].filter(id => id.toString() !== userId.toString());
  });

  if (!this.reactions[reactionType].includes(userId)) {
    this.reactions[reactionType].push(userId);
  }

  return this.save();
};

postSchema.methods.removeReaction = async function(userId) {
  const types = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
  types.forEach(type => {
    this.reactions[type] = this.reactions[type].filter(id => id.toString() !== userId.toString());
  });
  return this.save();
};

postSchema.methods.incrementCommentCount = async function() {
  this.commentCount += 1;
  return this.save();
};

postSchema.methods.decrementCommentCount = async function() {
  if (this.commentCount > 0) this.commentCount -= 1;
  return this.save();
};

postSchema.methods.incrementShareCount = async function() {
  this.shareCount += 1;
  return this.save();
};

postSchema.methods.incrementViewCount = async function() {
  this.viewCount += 1;
  return this.save();
};

postSchema.methods.hasUserReacted = function(userId) {
  const types = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
  for (const type of types) {
    if (this.reactions[type].some(id => id.toString() === userId.toString())) return type;
  }
  return null;
};

// Static methods
postSchema.statics.getTrendingPosts = function(limit = 20, timeframe = 24) {
  const timeAgo = new Date(Date.now() - timeframe * 60 * 60 * 1000);
  return this.aggregate([
    { $match: { createdAt: { $gte: timeAgo }, visibility: 'public', isArchived: false } },
    {
      $addFields: {
        totalReactions: {
          $add: [
            { $size: '$reactions.like' },
            { $size: '$reactions.love' },
            { $size: '$reactions.haha' },
            { $size: '$reactions.wow' },
            { $size: '$reactions.sad' },
            { $size: '$reactions.angry' }
          ]
        },
        engagementScore: {
          $add: [
            { $multiply: [{ $size: '$reactions.like' }, 1] },
            { $multiply: [{ $size: '$reactions.love' }, 2] },
            { $multiply: ['$commentCount', 3] },
            { $multiply: ['$shareCount', 5] }
          ]
        }
      }
    },
    { $sort: { engagementScore: -1 } },
    { $limit: limit }
  ]);
};

postSchema.statics.searchPosts = function(searchQuery, limit = 20) {
  const regex = new RegExp(searchQuery, 'i');
  return this.find({
    $or: [{ content: regex }, { hashtags: regex }],
    visibility: 'public',
    isArchived: false
  })
  .populate('user', 'username avatar isVerified')
  .sort({ createdAt: -1 })
  .limit(limit);
};

postSchema.statics.getPostsByHashtag = function(hashtag, limit = 20) {
  return this.find({
    hashtags: hashtag.toLowerCase(),
    visibility: 'public',
    isArchived: false
  })
  .populate('user', 'username avatar isVerified')
  .sort({ createdAt: -1 })
  .limit(limit);
};

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
