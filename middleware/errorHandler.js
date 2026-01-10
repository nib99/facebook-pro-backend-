/**
 * Global error handling middleware
 * Must be placed after all routes
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      statusCode: 404,
      message: message,
      details: `Invalid ${err.path}: ${err.value}`
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `Duplicate field value entered`;
    error = {
      statusCode: 400,
      message: message,
      details: `The ${field} '${value}' already exists. Please use another value.`
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    error = {
      statusCode: 400,
      message: 'Validation error',
      details: messages
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      statusCode: 401,
      message: 'Invalid token',
      details: 'The provided authentication token is invalid'
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      statusCode: 401,
      message: 'Token expired',
      details: 'Your authentication token has expired. Please log in again.'
    };
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    error = {
      statusCode: 400,
      message: 'File upload error',
      details: err.message
    };
  }

  // Default error response
  res.status(error.statusCode || err.statusCode || 500).json({
    success: false,
    error: error.message || 'Server error',
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err 
    })
  });
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = errorHandler;
module.exports.notFound = notFound;
module.exports.asyncHandler = asyncHandler;



