const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const videoCallSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Caller is required'],
    index: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required'],
    index: true
  },
  callType: {
    type: String,
    enum: ['video', 'audio'],
    default: 'video'
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'active', 'ended', 'rejected', 'missed', 'declined', 'busy', 'failed'],
    default: 'initiated',
    index: true
  },
  roomId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  startedAt: { type: Date, default: Date.now },
  answeredAt: Date,
  endedAt: Date,
  duration: { type: Number, default: 0 },
  quality: {
    type: String,
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  },
  connectionType: {
    caller: { type: String, enum: ['wifi', '4g', '5g', '3g', 'unknown'], default: 'unknown' },
    recipient: { type: String, enum: ['wifi', '4g', '5g', '3g', 'unknown'], default: 'unknown' }
  },
  endReason: {
    type: String,
    enum: ['caller-ended', 'recipient-ended', 'timeout', 'connection-lost', 'error', 'rejected']
  },
  isRecorded: { type: Boolean, default: false },
  recordingUrl: String,
  metadata: {
    callerId: String,
    recipientId: String,
    serverRegion: String,
    iceServers: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
videoCallSchema.index({ caller: 1, createdAt: -1 });
videoCallSchema.index({ recipient: 1, createdAt: -1 });
videoCallSchema.index({ roomId: 1 }, { unique: true });
videoCallSchema.index({ status: 1, createdAt: -1 });
videoCallSchema.index({ createdAt: -1 });

// Virtuals
videoCallSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return '0:00';
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  return hours > 0 
    ? `\( {hours}: \){minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `\( {minutes}: \){seconds.toString().padStart(2, '0')}`;
});

videoCallSchema.virtual('isOngoing').get(function() {
  return ['active', 'ringing', 'initiated'].includes(this.status);
});

// Methods
videoCallSchema.methods.answer = async function() {
  if (!['ringing', 'initiated'].includes(this.status)) {
    throw new Error('Call cannot be answered in current state');
  }
  this.status = 'active';
  this.answeredAt = new Date();
  return this.save();
};

videoCallSchema.methods.end = async function(endedBy = 'caller', reason = 'caller-ended') {
  if (this.status === 'ended') throw new Error('Call has already ended');
  this.status = 'ended';
  this.endedAt = new Date();
  this.endReason = reason;
  if (this.answeredAt) {
    this.duration = Math.floor((this.endedAt - this.answeredAt) / 1000);
  }
  return this.save();
};

videoCallSchema.methods.reject = async function(reason = 'rejected') {
  if (this.status === 'ended') throw new Error('Call has already ended');
  this.status = 'rejected';
  this.endedAt = new Date();
  this.endReason = reason;
  return this.save();
};

videoCallSchema.methods.markAsMissed = async function() {
  this.status = 'missed';
  this.endedAt = new Date();
  this.endReason = 'timeout';
  return this.save();
};

videoCallSchema.methods.updateQuality = async function(quality) {
  const valid = ['excellent', 'good', 'fair', 'poor'];
  if (!valid.includes(quality)) throw new Error('Invalid quality value');
  this.quality = quality;
  return this.save();
};

// Statics
videoCallSchema.statics.getCallHistory = function(userId, limit = 50) {
  return this.find({
    $or: [{ caller: userId }, { recipient: userId }]
  })
  .populate('caller', 'username avatar isOnline')
  .populate('recipient', 'username avatar isOnline')
  .sort({ createdAt: -1 })
  .limit(limit);
};

videoCallSchema.statics.getMissedCalls = function(userId) {
  return this.find({ recipient: userId, status: 'missed' })
    .populate('caller', 'username avatar isOnline')
    .sort({ createdAt: -1 });
};

videoCallSchema.statics.getActiveCalls = function(userId) {
  return this.find({
    $or: [{ caller: userId }, { recipient: userId }],
    status: { $in: ['active', 'ringing', 'initiated'] }
  })
  .populate('caller', 'username avatar')
  .populate('recipient', 'username avatar');
};

videoCallSchema.statics.getCallStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { $or: [{ caller: userId }, { recipient: userId }] } },
    { $group: { _id: '$status', count: { $sum: 1 }, totalDuration: { $sum: '$duration' } } }
  ]);
  const totalCalls = await this.countDocuments({ $or: [{ caller: userId }, { recipient: userId }] });
  return {
    totalCalls,
    stats,
    totalMinutes: Math.floor(stats.reduce((acc, s) => acc + s.totalDuration, 0) / 60)
  };
};

const VideoCall = mongoose.model('VideoCall', videoCallSchema);
module.exports = VideoCall;
