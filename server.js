require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const http = require('http');
const socketIo = require('socket.io');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const videoCallRoutes = require('./routes/videoCalls');
const liveStreamRoutes = require('./routes/liveStreams');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to database
connectDB();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Static files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/video-calls', videoCallRoutes);
app.use('/api/live-streams', liveStreamRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Facebook Pro API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/api/health'
  });
});

// Socket.io connection handling
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // User authentication
  socket.on('authenticate', (data) => {
    const { userId, username } = data;
    onlineUsers.set(userId, { socketId: socket.id, username });
    socket.userId = userId;
    
    // Broadcast online status
    io.emit('user-online', { userId, username });
    
    console.log(`✅ User authenticated: ${username} (${userId})`);
  });
    // Video call signaling
  socket.on('call-user', (data) => {
    const { to, offer, from } = data;
    const recipient = onlineUsers.get(to);
    
    if (recipient) {
      io.to(recipient.socketId).emit('incoming-call', {
        from,
        offer
      });
    }
  });

  socket.on('answer-call', (data) => {
    const { to, answer } = data;
    const caller = onlineUsers.get(to);
    
    if (caller) {
      io.to(caller.socketId).emit('call-answered', { answer });
    }
  });

  socket.on('ice-candidate', (data) => {
    const { to, candidate } = data;
    const recipient = onlineUsers.get(to);
    
    if (recipient) {
      io.to(recipient.socketId).emit('ice-candidate', { candidate });
    }
  });

  socket.on('end-call', (data) => {
    const { to } = data;
    const recipient = onlineUsers.get(to);
    
    if (recipient) {
      io.to(recipient.socketId).emit('call-ended');
    }
  });

  // Live stream events
  socket.on('join-stream', (data) => {
    const { streamId } = data;
    socket.join(`stream-${streamId}`);
    io.to(`stream-${streamId}`).emit('viewer-joined', { 
      userId: socket.userId 
    });
  });

  socket.on('leave-stream', (data) => {
    const { streamId } = data;
    socket.leave(`stream-${streamId}`);
    io.to(`stream-${streamId}`).emit('viewer-left', { 
      userId: socket.userId 
    });
  });
  
  socket.on('stream-comment', (data) => {
    const { streamId, comment } = data;
    io.to(`stream-${streamId}`).emit('new-comment', comment);
  });

  // Chat/Messaging
  socket.on('send-message', (data) => {
    const { to, message } = data;
    const recipient = onlineUsers.get(to);
    
    if (recipient) {
      io.to(recipient.socketId).emit('new-message', message);
    }
  });

  socket.on('typing', (data) => {
    const { to } = data;
    const recipient = onlineUsers.get(to);
    
    if (recipient) {
      io.to(recipient.socketId).emit('user-typing', { 
        userId: socket.userId 
      });
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    if (socket.userId) {
      const user = onlineUsers.get(socket.userId);
      if (user) {
        onlineUsers.delete(socket.userId);
        io.emit('user-offline', { userId: socket.userId });
        console.log(`❌ User disconnected: ${user.username}`);
      }
    }
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Error handler (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});
// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💤 Process terminated');
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║                                                      ║
║   🚀 FACEBOOK PRO BACKEND SERVER                    ║
║                                                      ║
║   ✅ Server running on port ${PORT}                    ║
║   🌐 URL: http://localhost:${PORT}                     ║
║   📊 Environment: ${process.env.NODE_ENV || 'development'}                    ║
║   💾 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}                         ║
║                                                      ║
║   📖 Documentation: http://localhost:${PORT}/api      ║
║   ❤️  Health Check: http://localhost:${PORT}/api/health ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
