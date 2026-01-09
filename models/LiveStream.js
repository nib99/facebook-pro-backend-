const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const liveStreamSchema = new mongoose.Schema({
  streamer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Streamer is required'],
    index: true
  },
  streamId: {
    type: String,
    required: true,
    unique: true,
    default: () => `stream-${uuidv4()}`
  },
  title: {
    type: String,
    required: [true, 'Stream title is required'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
    trim: true
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    trim: true
  },
  thumbnail: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['gaming', 'music', 'sports', 'education', 'entertainment', 'cooking', 'tech', 'travel', 'fitness', 'art', 'general'],
    default: 'general',
    index: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'paused'],
    default: 'live',
    index: true
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'followers-only'],
    default: 'public'
  },
  viewers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date
  }],
  currentViewerCount: {
    type: Number,
    default: 0
  },
  peakViewerCount: {
    type: Number,
    default: 0
  },
  totalViewCount: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      maxlength: 500
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  scheduledFor: {
    type: Date
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  duration: {
    type: Number,
    default: 0 // Duration in seconds
  },
  quality: {
    type: String,
    enum: ['360p', '480p', '720p', '1080p', 'auto'],
    default: 'auto'
  },
  streamKey: {
    type: String,
    unique: true,
    default: () => uuidv4()
  },
  rtmpUrl: {
    type: String
  },
  playbackUrl: {
    type: String
  },
  recordingUrl: {
    type: String
  },
  isRecorded: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isMonetized: {
    type: Boolean,
    default: false
  },
  revenue: {
    type: Number,
    default: 0
  },
  metadata: {
    bitrate: Number,
    fps: Number,
    codec: String,
    resolution: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
liveStreamSchema.index({ streamer: 1, createdAt: -1 });
liveStreamSchema.index({ status: 1, currentViewerCount: -1 });
liveStreamSchema.index({ category: 1, status: 1 });
liveStreamSchema.index({ streamId: 1 }, { unique: true });
liveStreamSchema.index({ tags: 1 });
liveStreamSchema.index({ isFeatured: 1, currentViewerCount: -1 });

// Virtual for like count
liveStreamSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comment count
liveStreamSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Virtual for share count
liveStreamSchema.virtual('shareCount').get(function() {
  return this.shares ? this.shares.length : 0;
});

// Virtual for formatted duration
liveStreamSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return '0:00';
  
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Virtual for is live
liveStreamSchema.virtual('isLive').get(function() {
  return this.status === 'live';
});

// Method to start stream
liveStreamSchema.methods.start = async function() {
  this.status = 'live';
  this.startedAt = new Date();
  
  return this.save();
};

// Method to end stream
liveStreamSchema.methods.end = async function() {
  this.status = 'ended';
  this.endedAt = new Date();
  
  if (this.startedAt) {
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  }
  
  return this.save();
};

// Method to pause stream
liveStreamSchema.methods.pause = async function() {
  this.status = 'paused';
  return this.save();
};

// Method to resume stream
liveStreamSchema.methods.resume = async function() {
  this.status = 'live';
  return this.save();
};

// Method to add viewer
liveStreamSchema.methods.addViewer = async function(userId) {
  // Check if user is already viewing
  const existingViewer = this.viewers.find(
    v => v.user.toString() === userId.toString() && !v.leftAt
  );
  
  if (!existingViewer) {
    this.viewers.push({ user: userId, joinedAt: new Date() });
    this.currentViewerCount += 1;
    this.totalViewCount += 1;
    
    // Update peak viewer count if necessary
    if (this.currentViewerCount > this.peakViewerCount) {
      this.peakViewerCount = this.currentViewerCount;
    }
  }
  
  return this.save();
};

// Method to remove viewer
liveStreamSchema.methods.removeViewer = async function(userId) {
  const viewer = this.viewers.find(
    v => v.user.toString() === userId.toString() && !v.leftAt
  );
  
  if (viewer) {
    viewer.leftAt = new Date();
    this.currentViewerCount = Math.max(0, this.currentViewerCount - 1);
  }
  
  return this.save();
};

// Method to add like
liveStreamSchema.methods.addLike = async function(userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
  }
  
  return this.save();
};

// Method to remove like
liveStreamSchema.methods.removeLike = async function(userId) {
  this.likes = this.likes.filter(id => id.toString() !== userId.toString());
  return this.save();
};

// Method to add comment
liveStreamSchema.methods.addComment = async function(userId, content) {
  this.comments.push({
    user: userId,
    content: content,
    timestamp: new Date()
  });
  
  // Keep only last 500 comments
  if (this.comments.length > 500) {
    this.comments = this.comments.slice(-500);
  }
  
  return this.save();
};

// Method to add share
liveStreamSchema.methods.addShare = async function(userId) {
  this.shares.push({
    user: userId,
    sharedAt: new Date()
  });
  
  return this.save();
};

// Static method to get active streams
liveStreamSchema.statics.getActiveStreams = function(category = 'all', limit = 20) {
  const query = { status: 'live', visibility: 'public' };
  
  if (category !== 'all') {
    query.category = category;
  }
  
  return this.find(query)
    .populate('streamer', 'username avatar isVerified')
    .sort({ currentViewerCount: -1, startedAt: -1 })
    .limit(limit);
};

// Static method to get trending streams
liveStreamSchema.statics.getTrendingStreams = function(limit = 10) {
  return this.find({
    status: 'live',
    visibility: 'public'
  })
  .populate('streamer', 'username avatar isVerified')
  .sort({ 
    currentViewerCount: -1, 
    likeCount: -1,
    commentCount: -1 
  })
  .limit(limit);
};

// Static method to get featured streams
liveStreamSchema.statics.getFeaturedStreams = function() {
  return this.find({
    status: 'live',
    isFeatured: true,
    visibility: 'public'
  })
  .populate('streamer', 'username avatar isVerified')
  .sort({ currentViewerCount: -1 });
};

// Static method to search streams
liveStreamSchema.statics.searchStreams = function(searchQuery, limit = 20) {
  const regex = new RegExp(searchQuery, 'i');
  
  return this.find({
    $or: [
      { title: regex },
      { description: regex },
      { tags: regex }
    ],
    status: 'live',
    visibility: 'public'
  })
  .populate('streamer', 'username avatar isVerified')
  .sort({ currentViewerCount: -1 })
  .limit(limit);
};

const LiveStream = mongoose.model('LiveStream', liveStreamSchema);

module.exports = LiveStream;
