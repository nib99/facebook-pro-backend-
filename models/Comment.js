const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, 'Comment must belong to a post'],
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Comment must belong to a user'],
    index: true
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    trim: true
  },
  media: {
    url: String,
    publicId: String
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  reactions: {
    like: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    love: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    haha: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replyCount: { type: Number, default: 0 },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ user: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: 1 });

// Virtuals
commentSchema.virtual('reactionCount').get(function() {
  return (
    (this.reactions.like?.length || 0) +
    (this.reactions.love?.length || 0) +
    (this.reactions.haha?.length || 0)
  );
});

commentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment'
});

// Methods
commentSchema.methods.addReaction = async function(userId, reactionType) {
  const validReactions = ['like', 'love', 'haha'];
  if (!validReactions.includes(reactionType)) throw new Error('Invalid reaction type');

  validReactions.forEach(type => {
    this.reactions[type] = this.reactions[type].filter(id => id.toString() !== userId.toString());
  });

  if (!this.reactions[reactionType].includes(userId)) {
    this.reactions[reactionType].push(userId);
  }

  return this.save();
};

commentSchema.methods.removeReaction = async function(userId) {
  const types = ['like', 'love', 'haha'];
  types.forEach(type => {
    this.reactions[type] = this.reactions[type].filter(id => id.toString() !== userId.toString());
  });
  return this.save();
};

// Hooks
commentSchema.post('save', async function(doc) {
  const Post = mongoose.model('Post');
  if (!doc.parentComment && !doc.isDeleted) {
    await Post.findByIdAndUpdate(doc.post, { $inc: { commentCount: 1 } });
  }
  if (doc.parentComment && !doc.isDeleted) {
    await mongoose.model('Comment').findByIdAndUpdate(doc.parentComment, { $inc: { replyCount: 1 } });
  }
});

commentSchema.pre('remove', async function(next) {
  const Post = mongoose.model('Post');
  if (!this.parentComment) {
    await Post.findByIdAndUpdate(this.post, { $inc: { commentCount: -1 } });
  }
  if (this.parentComment) {
    await mongoose.model('Comment').findByIdAndUpdate(this.parentComment, { $inc: { replyCount: -1 } });
  }
  next();
});

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;
