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
const errorHandler = require('./middleware/error'); // ← fixed: your file is error.js (not errorHandler.js)


// ────────────────────────────────────────────────
//                  ROUTES (corrected imports)
// ────────────────────────────────────────────────
const authRoutes         = require('./routes/authRoutes');
const userRoutes         = require('./routes/userRoutes');
const postRoutes         = require('./routes/postRoutes');
const messageRoutes      = require('./routes/messageRoutes');
const friendshipRoutes   = require('./routes/friendshipRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const storyRoutes        = require('./routes/storyRoutes');
const groupRoutes        = require('./routes/groupRoutes');
const adminRoutes        = require('./routes/adminRoutes');
const videoCallRoutes    = require('./routes/videoCallRoutes');    // ← adjust name if file is actually videoCalls.js
const liveStreamRoutes   = require('./routes/liveStreamRoutes');   // ← adjust name if file is actually liveStreams.js


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
      connectSrc: ["'self'", "wss:"], // ← important for socket.io
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(mongoSanitize());
app.use(xss());
app.use(hpp());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Stricter auth limits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Static files
app.use('/uploads', express.static('uploads'));

// ────────────────────────────────────────────────
//                  MOUNT ROUTES
// ────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/posts',         postRoutes);
app.use('/api/messages',      messageRoutes);
app.use('/api/friendships',   friendshipRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stories',       storyRoutes);
app.use('/api/groups',        groupRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/video-calls',   videoCallRoutes);
app.use('/api/live-streams',  liveStreamRoutes);

// Health check
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

// ────────────────────────────────────────────────
//                  SOCKET.IO
// ────────────────────────────────────────────────
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // ← Note: This auth method is still insecure – consider JWT later
  socket.on('authenticate', (data) => {
    const { userId, username } = data;
    onlineUsers.set(userId, { socketId: socket.id, username });
    socket.userId = userId;
    
    io.emit('user-online', { userId, username });
    console.log(`✅ User authenticated: \( {username} ( \){userId})`);
  });

  // Video call events...
  socket.on('call-user', (data) => {
    const { to, offer, from } = data;
    const recipient = onlineUsers.get(to);
    if (recipient) {
      io.to(recipient.socketId).emit('incoming-call', { from, offer });
    }
  });

  // ... (all other socket events remain the same)

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

// Make io accessible in routes/controllers if needed
app.set('io', io);

// Error handler - must be last middleware
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
    console.log('💤 Server closed');
    mongoose.connection.close(false, () => {
      console.log('💤 MongoDB connection closed');
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
║   Port:          ${PORT}                              ║
║   Env:           ${process.env.NODE_ENV || 'development'} ║
║   Database:      ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'} ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
