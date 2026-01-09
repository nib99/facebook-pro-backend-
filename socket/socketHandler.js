const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');

// Global maps for real-time state
const onlineUsers = new Map();        // userId → socket.id
const typingUsers = new Map();        // `\( {conversationId}: \){userId}` → timeout
const activeCalls = new Map();        // callId → call data

const socketHandler = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || user.isBlocked) return next(new Error('Invalid user'));

      socket.user = user;
      socket.userId = user._id.toString();
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: \( {socket.user.username} ( \){socket.userId})`);

    // Mark user online
    onlineUsers.set(socket.userId, socket.id);
    await User.findByIdAndUpdate(socket.userId, { isOnline: true, lastSeen: new Date() });

    // Join personal room
    socket.join(`user:${socket.userId}`);

    // Notify friends
    const userWithFriends = await User.findById(socket.userId).populate('friends', '_id');
    userWithFriends?.friends.forEach(friend => {
      const friendSocket = onlineUsers.get(friend._id.toString());
      if (friendSocket) {
        io.to(friendSocket).emit('friend-online', { userId: socket.userId });
      }
    });

    // ==================== MESSAGING ====================

    socket.on('join-conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave-conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('send-message', async ({ conversationId, content, replyTo, media }) => {
      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation?.participants.includes(socket.userId)) return;

        const message = await Message.create({
          conversation: conversationId,
          sender: socket.userId,
          content,
          replyTo,
          media
        });

        await message.populate('sender', 'username firstName lastName avatar');

        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();
        await conversation.save();

        io.to(`conversation:${conversationId}`).emit('new-message', message);

        // Notify offline participants
        conversation.participants.forEach(async (p) => {
          if (p.toString() !== socket.userId && !onlineUsers.has(p.toString())) {
            await Notification.createNotification({
              recipient: p,
              sender: socket.userId,
              type: 'message',
              title: 'New message',
              message: content ? `${socket.user.username}: ${content.substring(0, 50)}...` : 'Sent a media',
              relatedConversation: conversationId
            });
          }
        });
      } catch (err) {
        socket.emit('message-error', { error: 'Failed to send' });
      }
    });

    socket.on('typing-start', ({ conversationId }) => {
      const key = `\( {conversationId}: \){socket.userId}`;
      if (!typingUsers.has(key)) {
        const timeout = setTimeout(() => typingUsers.delete(key), 3000);
        typingUsers.set(key, timeout);
        socket.to(`conversation:${conversationId}`).emit('typing-start', {
          userId: socket.userId,
          username: socket.user.username
        });
      }
    });

    socket.on('typing-stop', ({ conversationId }) => {
      const key = `\( {conversationId}: \){socket.userId}`;
      const timeout = typingUsers.get(key);
      if (timeout) clearTimeout(timeout);
      typingUsers.delete(key);
      socket.to(`conversation:${conversationId}`).emit('typing-stop', { userId: socket.userId });
    });

    socket.on('mark-read', async ({ conversationId, messageIds }) => {
      await Message.markConversationAsRead(conversationId, socket.userId);
      io.to(`conversation:${conversationId}`).emit('messages-read', { userId: socket.userId, messageIds });
    });

    socket.on('message-reaction', async ({ messageId, emoji }) => {
      const message = await Message.findById(messageId);
      if (!message) return;

      await message.addReaction(socket.userId, emoji);

      io.to(`conversation:${message.conversation}`).emit('message-reaction-updated', {
        messageId,
        reactions: message.reactions
      });
    });

    // ==================== VIDEO CALLS ====================

    socket.on('initiate-call', ({ to, offer, callType = 'video' }) => {
      const toSocket = onlineUsers.get(to);
      if (!toSocket) return socket.emit('call-rejected', { reason: 'User offline' });

      const callId = `\( {socket.userId}- \){to}-${Date.now()}`;
      activeCalls.set(callId, { caller: socket.userId, recipient: to, callType });

      io.to(toSocket).emit('incoming-call', {
        callId,
        from: socket.userId,
        fromUser: { username: socket.user.username, avatar: socket.user.avatar },
        offer,
        callType
      });
    });

    socket.on('answer-call', ({ callId, answer }) => {
      const call = activeCalls.get(callId);
      if (!call) return;

      const callerSocket = onlineUsers.get(call.caller);
      if (callerSocket) {
        io.to(callerSocket).emit('call-answered', { callId, answer });
      }
    });

    socket.on('reject-call', ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call) return;

      const otherSocket = onlineUsers.get(call.caller === socket.userId ? call.recipient : call.caller);
      if (otherSocket) io.to(otherSocket).emit('call-rejected', { callId });
      activeCalls.delete(callId);
    });

    socket.on('end-call', ({ callId }) => {
      const call = activeCalls.get(callId);
      if (!call) return;

      const otherId = call.caller === socket.userId ? call.recipient : call.caller;
      const otherSocket = onlineUsers.get(otherId);
      if (otherSocket) io.to(otherSocket).emit('call-ended', { callId });
      activeCalls.delete(callId);
    });

    socket.on('ice-candidate', ({ to, candidate, callId }) => {
      const toSocket = onlineUsers.get(to);
      if (toSocket) {
        io.to(toSocket).emit('ice-candidate', { from: socket.userId, candidate, callId });
      }
    });

    // ==================== LIVE STREAMING ====================

    socket.on('start-stream', ({ streamId, title }) => {
      socket.join(`stream:${streamId}`);
      socket.broadcast.emit('stream-started', {
        streamId,
        streamer: socket.userId,
        title,
        username: socket.user.username,
        avatar: socket.user.avatar
      });
    });

    socket.on('join-stream', ({ streamId }) => {
      socket.join(`stream:${streamId}`);
      io.to(`stream:\( {streamId}`).emit('viewer-count-update', { count: io.sockets.adapter.rooms.get(`stream: \){streamId}`)?.size || 1 });
    });

    socket.on('leave-stream', ({ streamId }) => {
      socket.leave(`stream:${streamId}`);
    });

    socket.on('stream-comment', ({ streamId, comment }) => {
      io.to(`stream:${streamId}`).emit('new-stream-comment', {
        userId: socket.userId,
        username: socket.user.username,
        avatar: socket.user.avatar,
        comment,
        timestamp: new Date()
      });
    });

    // ==================== DISCONNECT ====================

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.userId}`);

      onlineUsers.delete(socket.userId);
      typingUsers.forEach((t, k) => k.endsWith(`:${socket.userId}`) && clearTimeout(t) && typingUsers.delete(k));

      // End active calls
      activeCalls.forEach((call, callId) => {
        if (call.caller === socket.userId || call.recipient === socket.userId) {
          const other = call.caller === socket.userId ? call.recipient : call.caller;
          const otherSocket = onlineUsers.get(other);
          if (otherSocket) io.to(otherSocket).emit('call-ended', { callId, reason: 'disconnect' });
          activeCalls.delete(callId);
        }
      });

      // Update offline
      await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: new Date() });

      // Notify friends
      const friends = await User.findById(socket.userId).populate('friends', '_id');
      friends?.friends.forEach(f => {
        const s = onlineUsers.get(f._id.toString());
        if (s) io.to(s).emit('friend-offline', { userId: socket.userId });
      });
    });
  });
};

module.exports = socketHandler;
