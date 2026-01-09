const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes - Require authentication
 */
const auth = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies (if using cookie-parser)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        error: 'Not authorized to access this route',
        message: 'No authentication token provided'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by id from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          message: 'The user belonging to this token no longer exists'
        });
      }

      // Check if user is active
      if (user.isBlocked) {
        return res.status(403).json({
          error: 'Account blocked',
          message: 'Your account has been blocked. Please contact support.'
        });
      }

      // Attach user to request object
      req.user = user;
      req.userId = user._id;

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Invalid token',
          message: 'The provided token is invalid'
        });
      }
	  if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.'
        });
      }

      throw error;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication failed',
      message: 'Server error in authentication'
    });
  }
};

/**
 * Admin authorization middleware
 * Must be used after auth middleware
 */
const adminAuth = async (req, res, next) => {
  try {
    // Check if user exists (should be set by auth middleware)
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'Please authenticate first'
      });
    }

    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have admin privileges'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ 
      error: 'Authorization failed',
      message: 'Server error in authorization'
    });
  }
};

/**
 * Optional authentication middleware
 * Doesn't fail if no token provided, just doesn't set req.user
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
	    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (user && !user.isBlocked) {
          req.user = user;
          req.userId = user._id;
        }
      } catch (error) {
        // Silently fail for optional auth
        console.log('Optional auth failed:', error.message);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};

/**
 * Check if user owns the resource
 * @param {string} resourceModel - Model name
 * @param {string} paramName - Parameter name in req.params
 */
const authorize = (resourceModel, paramName = 'id') => {
  return async (req, res, next) => {
    try {
      const Model = require(`../models/${resourceModel}`);
      const resource = await Model.findById(req.params[paramName]);

      if (!resource) {
        return res.status(404).json({
          error: 'Resource not found'
        });
      }

      // Check if user owns the resource or is admin
      const isOwner = resource.user && resource.user.toString() === req.userId.toString();
      const isAdmin = req.user.isAdmin;

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          error: 'Not authorized',
          message: 'You do not have permission to perform this action'
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        error: 'Authorization failed',
        message: 'Server error in authorization'
      });
    }
  };
};

/**
 * Rate limit specific users
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.userId) {
      return next();
    }

    const userId = req.userId.toString();
    const now = Date.now();
    
    if (!requests.has(userId)) {
      requests.set(userId, []);
    }

    const userRequests = requests.get(userId);
    const recentRequests = userRequests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.'
      });
    }

    recentRequests.push(now);
    requests.set(userId, recentRequests);

    next();
  };
};

module.exports = {
  auth,
  adminAuth,
  optionalAuth,
  authorize,
  userRateLimit
};
