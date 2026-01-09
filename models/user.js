const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  avatar: {
    type: String,
    default: ''
  },
  coverPhoto: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters'],
    default: ''
  },
  location: {
    city: String,
    country: String
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'prefer-not-to-say'
  },
  phone: {
    type: String,
    trim: true
  },
  website: {
	  type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  interests: [{
    type: String,
    trim: true
  }],
  settings: {
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'public'
      },
      whoCanMessage: {
        type: String,
        enum: ['everyone', 'friends', 'nobody'],
        default: 'everyone'
      },
      whoCanSeeEmail: {
        type: String,
        enum: ['everyone', 'friends', 'only-me'],
        default: 'only-me'
      },
      whoCanSeeFriends: {
        type: String,
        enum: ['everyone', 'friends', 'only-me'],
        default: 'everyone'
      }
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
		      },
      sms: {
        type: Boolean,
        default: false
      }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  onlineStatus: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  verificationToken: String,
  verificationTokenExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ isOnline: 1, lastSeen: -1 });
userSchema.index({ 'location.city': 1, 'location.country': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.username;
});

// Virtual for friend count
userSchema.virtual('friendCount').get(function() {
  return this.friends ? this.friends.length : 0;
});
// Virtual for follower count
userSchema.virtual('followerCount').get(function() {
  return this.followers ? this.followers.length : 0;
});

// Virtual for following count
userSchema.virtual('followingCount').get(function() {
  return this.following ? this.following.length : 0;
});

// Virtual for account locked status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to get public profile (exclude sensitive data)
userSchema.methods.getPublicProfile = function() {
  return {
    _id: this._id,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    avatar: this.avatar,
    coverPhoto: this.coverPhoto,
    bio: this.bio,
    location: this.location,
    isVerified: this.isVerified,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    friendCount: this.friendCount,
    followerCount: this.followerCount,
    followingCount: this.followingCount,
    createdAt: this.createdAt
  };
  // Method to increment login attempts
userSchema.methods.incLoginAttempts = async function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Otherwise increment login attempts
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts
  const maxAttempts = 5;
  const lockTime = 15 * 60 * 1000; // 15 minutes
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Method to update last seen
userSchema.methods.updateLastSeen = async function() {
  this.lastSeen = Date.now();
  return this.save();
};

// Method to check if users are friends
userSchema.methods.isFriendsWith = function(userId) {
  return this.friends.some(friendId => friendId.toString() === userId.toString());
};

// Method to check if user is following another user
userSchema.methods.isFollowing = function(userId) {
  return this.following.some(followingId => followingId.toString() === userId.toString());
};

// Method to check if user has blocked another user
userSchema.methods.hasBlocked = function(userId) {
  return this.blockedUsers.some(blockedId => blockedId.toString() === userId.toString());
};

// Static method to find users by search query
userSchema.statics.searchUsers = function(searchQuery, limit = 20) {
  const regex = new RegExp(searchQuery, 'i');
  
  return this.find({
    $or: [
      { username: regex },
      { firstName: regex },
      { lastName: regex },
      { email: regex }
    ],
    isBlocked: false
  })
    .select('username firstName lastName avatar isVerified isOnline')
  .limit(limit);
};

// Static method to get suggested friends
userSchema.statics.getSuggestedFriends = async function(userId, limit = 10) {
  const user = await this.findById(userId).populate('friends');
  
  if (!user) {
    throw new Error('User not found');
  }

  // Find users who are friends with user's friends but not friends with user
  const friendIds = user.friends.map(friend => friend._id);
  
  return this.aggregate([
    {
      $match: {
        _id: { $nin: [...friendIds, userId] },
        isBlocked: false
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'friends',
        foreignField: '_id',
        as: 'mutualFriends'
      }
    },
    {
      $addFields: {
        mutualFriendsCount: {
          $size: {
            $filter: {
              input: '$mutualFriends',
              as: 'friend',
              cond: { $in: ['$$friend._id', friendIds] }
            }
          }
        }
      }
    },
    {
      $match: {
        mutualFriendsCount: { $gt: 0 }
      }
    },
    {
      $sort: { mutualFriendsCount: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        username: 1,
        firstName: 1,
        lastName: 1,
        avatar: 1,
        isVerified: 1,
        mutualFriendsCount: 1
      }
    }
  ]);
};
const User = mongoose.model('User', userSchema);

module.exports = User;
