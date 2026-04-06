require('dotenv').config();
require('express-async-errors');

const http = require('http');
const path = require('path');
const { randomUUID } = require('crypto');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const connectDB = require('./config/database');
const eurekaClient = require('./config/eureka');
const logger = require('./utils/logger');
const ApiError = require('./utils/ApiError');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { extractUser } = require('./middleware/extractUser');

const chatRoutes = require('./routes/chatRoutes');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const CallEvent = require('./models/CallEvent');
const { setIO } = require('./socket');

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Chat service is running',
    timestamp: new Date().toISOString(),
  });
});

// Serve uploaded files
app.use('/api/chat/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Extract user from API Gateway headers
app.use(extractUser);

// Routes
app.use('/', chatRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8089;
const NODE_ENV = process.env.NODE_ENV || 'development';
const normalizeOrigin = (value, fallback) => String(value || fallback || '').replace(/\/+$/, '');
const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL, 'http://localhost:5173');
const frontendUrlFallback = normalizeOrigin(process.env.FRONTEND_URL_FALLBACK, 'http://localhost:3000');

const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      frontendUrl,
      frontendUrlFallback,
    ],
    credentials: true,
  },
});

setIO(io);

const CALL_RING_TIMEOUT_MS = 30000;
const userRoomFor = (authId) => `user:${String(authId)}`;
const activeCalls = new Map(); // callId -> active call state
const CALLS_ENABLED = String(process.env.ENABLE_CHAT_CALLS || 'false').trim().toLowerCase() === 'true';

const normalizeCallType = (value) => (String(value || '').trim().toLowerCase() === 'video' ? 'video' : 'voice');

const buildIceServers = () => {
  const iceServers = [];

  const stunUrl = String(process.env.WEBRTC_STUN_URL || 'stun:stun.l.google.com:19302').trim();
  if (stunUrl) {
    iceServers.push({ urls: stunUrl });
  }

  const turnUrl = String(process.env.WEBRTC_TURN_URL || '').trim();
  const turnUsername = String(process.env.WEBRTC_TURN_USERNAME || '').trim();
  const turnCredential = String(process.env.WEBRTC_TURN_CREDENTIAL || '').trim();

  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  return iceServers;
};

const emitToUser = (authId, eventName, payload) => {
  io.to(userRoomFor(authId)).emit(eventName, payload);
};

const isCallParticipant = (call, authId) => {
  const key = String(authId || '').trim();
  if (!key) return false;
  return call?.callerAuthId === key || call?.calleeAuthId === key;
};

const toCallPayload = (call, extra = {}) => ({
  callId: call.callId,
  conversationId: call.conversationId,
  eventId: call.eventId,
  callType: call.callType,
  callerAuthId: call.callerAuthId,
  calleeAuthId: call.calleeAuthId,
  status: call.status,
  createdAt: new Date(call.createdAt).toISOString(),
  acceptedAt: call.acceptedAt ? new Date(call.acceptedAt).toISOString() : null,
  iceServers: call.iceServers,
  ...extra,
});

const clearCallTimer = (call) => {
  if (call?.timeoutHandle) {
    clearTimeout(call.timeoutHandle);
    call.timeoutHandle = null;
  }
};

const removeActiveCall = (callId) => {
  const call = activeCalls.get(callId);
  if (!call) return null;
  clearCallTimer(call);
  activeCalls.delete(callId);
  return call;
};

const persistMissedCallEvent = async ({ call, reason }) => {
  try {
    await CallEvent.create({
      callId: call.callId,
      conversationId: call.conversationId,
      eventId: call.eventId,
      callerAuthId: call.callerAuthId,
      calleeAuthId: call.calleeAuthId,
      callType: call.callType,
      status: reason === 'NO_ANSWER' ? 'TIMED_OUT' : 'MISSED',
      reason,
      pushStatus: 'PENDING',
      pushQueuedAt: new Date(),
      metadata: {
        timeoutMs: CALL_RING_TIMEOUT_MS,
      },
    });
  } catch (error) {
    logger.error('Failed to persist missed call event', {
      callId: call.callId,
      callerAuthId: call.callerAuthId,
      calleeAuthId: call.calleeAuthId,
      reason,
      message: error?.message,
    });
  }
};

const handleRingTimeout = async (callId) => {
  const call = activeCalls.get(callId);
  if (!call || call.status !== 'RINGING') return;

  call.status = 'TIMED_OUT';
  removeActiveCall(callId);
  await persistMissedCallEvent({ call, reason: 'NO_ANSWER' });

  const payload = toCallPayload(call, {
    reason: 'timeout',
    timeoutMs: CALL_RING_TIMEOUT_MS,
  });

  emitToUser(call.callerAuthId, 'call:timeout', payload);
  emitToUser(call.calleeAuthId, 'call:timeout', payload);
};

const verifySocketUser = (socket) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new ApiError(500, 'JWT_SECRET is not configured');

  const token = socket.handshake.auth?.token;
  if (!token) throw new ApiError(401, 'Authentication required');

  const payload = jwt.verify(token, secret);
  const authId = payload?.authId || payload?.sub || payload?.userId;
  if (!authId) throw new ApiError(401, 'Invalid token');

  return {
    authId: String(authId),
    role: payload?.role ? String(payload.role) : '',
  };
};

// In-memory presence tracking (single-instance). If you scale horizontally,
// replace this with a shared store (Redis) and a socket adapter.
const presenceRoomFor = (authId) => `presence:${String(authId)}`;
const authSocketIds = new Map(); // authId -> Set(socketId)

const isOnline = (authId) => {
  const set = authSocketIds.get(String(authId));
  return Boolean(set && set.size > 0);
};

const setSocketOnline = (authId, socketId) => {
  const key = String(authId);
  const prevOnline = isOnline(key);
  const set = authSocketIds.get(key) || new Set();
  set.add(String(socketId));
  authSocketIds.set(key, set);
  const nextOnline = true;
  if (!prevOnline && nextOnline) {
    io.to(presenceRoomFor(key)).emit('presence:update', { authId: key, online: true });
  }
};

const setSocketOffline = (authId, socketId) => {
  const key = String(authId);
  const set = authSocketIds.get(key);
  if (!set) return;
  const prevOnline = set.size > 0;
  set.delete(String(socketId));
  if (set.size === 0) authSocketIds.delete(key);
  const nextOnline = isOnline(key);
  if (prevOnline && !nextOnline) {
    io.to(presenceRoomFor(key)).emit('presence:update', { authId: key, online: false });
  }
};

const handleUserFullyOffline = async (authId) => {
  const key = String(authId || '').trim();
  if (!key) return;

  const impactedCallIds = [];
  for (const [callId, call] of activeCalls.entries()) {
    if (call.callerAuthId === key || call.calleeAuthId === key) {
      impactedCallIds.push(callId);
    }
  }

  for (const callId of impactedCallIds) {
    const call = activeCalls.get(callId);
    if (!call) continue;

    if (call.status === 'RINGING' && call.calleeAuthId === key) {
      call.status = 'MISSED';
      removeActiveCall(callId);
      await persistMissedCallEvent({ call, reason: 'OFFLINE' });

      emitToUser(call.callerAuthId, 'call:missed', toCallPayload(call, { reason: 'offline' }));
      continue;
    }

    if (call.status === 'RINGING') {
      call.status = 'ENDED';
      removeActiveCall(callId);

      const payload = toCallPayload(call, {
        reason: 'peer_offline',
        endedByAuthId: key,
      });

      emitToUser(call.callerAuthId, 'call:ended', payload);
      emitToUser(call.calleeAuthId, 'call:ended', payload);
      continue;
    }

    if (call.status === 'ACTIVE') {
      call.status = 'ENDED';
      removeActiveCall(callId);

      const payload = toCallPayload(call, {
        reason: 'peer_offline',
        endedByAuthId: key,
      });

      emitToUser(call.callerAuthId, 'call:ended', payload);
      emitToUser(call.calleeAuthId, 'call:ended', payload);
    }
  }
};

io.use((socket, next) => {
  try {
    socket.user = verifySocketUser(socket);
    next();
  } catch (e) {
    next(e);
  }
});

io.on('connection', (socket) => {
  const me = socket.user;
  logger.info('Socket connected', { authId: me?.authId });

  // Track presence for this authenticated user
  setSocketOnline(me.authId, socket.id);
  socket.join(userRoomFor(me.authId));

  socket.data.watchedPresence = new Set();

  socket.on('presence:watch', ({ authIds } = {}, ack) => {
    try {
      const next = Array.isArray(authIds) ? authIds : [];
      const cleaned = [];
      const seen = new Set();
      for (const raw of next) {
        const id = String(raw || '').trim();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        cleaned.push(id);
        if (cleaned.length >= 200) break;
      }

      const prev = socket.data.watchedPresence instanceof Set ? socket.data.watchedPresence : new Set();

      // Leave rooms no longer watched
      for (const id of prev) {
        if (!seen.has(id)) socket.leave(presenceRoomFor(id));
      }

      // Join new watched rooms
      for (const id of cleaned) {
        if (!prev.has(id)) socket.join(presenceRoomFor(id));
      }

      socket.data.watchedPresence = new Set(cleaned);

      // Emit current state immediately
      for (const id of cleaned) {
        socket.emit('presence:update', { authId: id, online: isOnline(id) });
      }

      if (typeof ack === 'function') ack({ success: true });
    } catch (e) {
      if (typeof ack === 'function') ack({ success: false, message: e.message });
    }
  });

  socket.on('conversation:join', async ({ conversationId, eventId } = {}) => {
    try {
      let convo = null;

      if (conversationId) {
        convo = await Conversation.findById(String(conversationId)).lean();
      } else if (eventId) {
        const safeEventId = String(eventId).trim();
        convo = await Conversation.findOneAndUpdate(
          { eventId: safeEventId, kind: 'EVENT' },
          {
            $setOnInsert: { eventId: safeEventId, kind: 'EVENT' },
            $addToSet: { participants: { authId: me.authId, role: me.role } },
          },
          { new: true, upsert: true }
        ).lean();
      }

      if (!convo) throw new ApiError(404, 'Conversation not found');

      socket.join(String(convo._id));
      socket.emit('conversation:joined', { conversationId: String(convo._id), eventId: convo.eventId });
    } catch (e) {
      socket.emit('error', { message: e.message || 'Failed to join conversation' });
    }
  });

  socket.on('message:send', async ({ conversationId, text } = {}) => {
    try {
      const convoId = String(conversationId || '').trim();
      const convo = await Conversation.findById(convoId).lean();
      if (!convo) throw new ApiError(404, 'Conversation not found');

      const trimmed = String(text || '').trim();
      if (!trimmed) throw new ApiError(400, 'text is required');

      const msg = await Message.create({
        conversationId: convoId,
        eventId: convo.eventId,
        senderAuthId: me.authId,
        senderRole: me.role,
        text: trimmed,
        attachments: [],
        readBy: [me.authId],
      });

      await Conversation.updateOne(
        { _id: convoId },
        { $set: { lastMessageAt: new Date() } }
      );

      const payload = msg.toObject ? msg.toObject() : msg;
      io.to(convoId).emit('message:new', payload);
    } catch (e) {
      socket.emit('error', { message: e.message || 'Failed to send message' });
    }
  });

  socket.on('messages:read', async ({ conversationId } = {}) => {
    try {
      const convoId = String(conversationId || '').trim();
      if (!convoId) throw new ApiError(400, 'conversationId is required');

      await Message.updateMany(
        { conversationId: convoId, readBy: { $ne: me.authId } },
        { $addToSet: { readBy: me.authId } }
      );

      io.to(convoId).emit('messages:read', { conversationId: convoId, authId: me.authId });
    } catch (e) {
      socket.emit('error', { message: e.message || 'Failed to mark read' });
    }
  });

  if (!CALLS_ENABLED) {
    const callDisabledMessage = 'Voice and video calls are currently disabled';
    const rejectCallAction = (ack) => {
      if (typeof ack === 'function') {
        ack({ success: false, message: callDisabledMessage });
      }
    };

    socket.on('call:initiate', (_, ack) => rejectCallAction(ack));
    socket.on('call:accept', (_, ack) => rejectCallAction(ack));
    socket.on('call:reject', (_, ack) => rejectCallAction(ack));
    socket.on('call:end', (_, ack) => rejectCallAction(ack));
    socket.on('call:signal', (_, ack) => rejectCallAction(ack));
    socket.on('call:missed:list', (_, ack) => {
      if (typeof ack === 'function') {
        ack({ success: true, data: [] });
      }
    });
  } else {

  socket.on('call:initiate', async ({ conversationId, calleeAuthId, callType } = {}, ack) => {
    try {
      const convoId = String(conversationId || '').trim();
      if (!convoId) throw new ApiError(400, 'conversationId is required');

      const calleeId = String(calleeAuthId || '').trim();
      if (!calleeId) throw new ApiError(400, 'calleeAuthId is required');
      if (calleeId === me.authId) throw new ApiError(400, 'Cannot call yourself');

      const convo = await Conversation.findById(convoId).lean();
      if (!convo) throw new ApiError(404, 'Conversation not found');

      const participants = new Set(
        (Array.isArray(convo.participants) ? convo.participants : [])
          .map((p) => String(p?.authId || '').trim())
          .filter(Boolean)
      );

      if (!participants.has(me.authId)) {
        throw new ApiError(403, 'You are not a conversation participant');
      }

      if (!participants.has(calleeId)) {
        throw new ApiError(400, 'Callee is not in this conversation');
      }

      for (const call of activeCalls.values()) {
        const samePair =
          (call.callerAuthId === me.authId && call.calleeAuthId === calleeId)
          || (call.callerAuthId === calleeId && call.calleeAuthId === me.authId);

        if (samePair && (call.status === 'RINGING' || call.status === 'ACTIVE')) {
          throw new ApiError(409, 'A call is already in progress with this contact');
        }
      }

      const callId = randomUUID();
      const nextCall = {
        callId,
        conversationId: convoId,
        eventId: String(convo.eventId || '').trim(),
        callerAuthId: me.authId,
        calleeAuthId: calleeId,
        callerSocketId: socket.id,
        calleeSocketId: null,
        callType: normalizeCallType(callType),
        status: 'RINGING',
        createdAt: Date.now(),
        acceptedAt: null,
        timeoutHandle: null,
        iceServers: buildIceServers(),
      };

      if (!isOnline(calleeId)) {
        nextCall.status = 'MISSED';
        await persistMissedCallEvent({ call: nextCall, reason: 'OFFLINE' });

        const payload = toCallPayload(nextCall, { reason: 'offline' });
        emitToUser(me.authId, 'call:missed', payload);

        if (typeof ack === 'function') ack({ success: true, missed: true, reason: 'offline', callId });
        return;
      }

      nextCall.timeoutHandle = setTimeout(() => {
        handleRingTimeout(callId).catch((error) => {
          logger.error('Failed to process call timeout', {
            callId,
            message: error?.message,
          });
        });
      }, CALL_RING_TIMEOUT_MS);

      activeCalls.set(callId, nextCall);

      const payload = toCallPayload(nextCall);
      emitToUser(calleeId, 'call:incoming', payload);
      emitToUser(me.authId, 'call:ringing', payload);

      if (typeof ack === 'function') ack({ success: true, callId });
    } catch (e) {
      if (typeof ack === 'function') {
        ack({ success: false, message: e.message || 'Failed to initiate call' });
      }
    }
  });

  socket.on('call:accept', ({ callId } = {}, ack) => {
    try {
      const key = String(callId || '').trim();
      if (!key) throw new ApiError(400, 'callId is required');

      const call = activeCalls.get(key);
      if (!call) throw new ApiError(404, 'Call not found');

      if (call.calleeAuthId !== me.authId) {
        throw new ApiError(403, 'Only callee can accept this call');
      }

      if (call.status !== 'RINGING' && call.status !== 'ACTIVE') {
        throw new ApiError(409, 'Call is no longer available');
      }

      call.status = 'ACTIVE';
      call.calleeSocketId = socket.id;
      call.acceptedAt = Date.now();
      clearCallTimer(call);

      const payload = toCallPayload(call, {
        acceptedByAuthId: me.authId,
        acceptedBySocketId: socket.id,
      });

      emitToUser(call.callerAuthId, 'call:accepted', payload);
      emitToUser(call.calleeAuthId, 'call:accepted', payload);

      if (typeof ack === 'function') ack({ success: true, callId: key });
    } catch (e) {
      if (typeof ack === 'function') {
        ack({ success: false, message: e.message || 'Failed to accept call' });
      }
    }
  });

  socket.on('call:reject', ({ callId, reason } = {}, ack) => {
    try {
      const key = String(callId || '').trim();
      if (!key) throw new ApiError(400, 'callId is required');

      const call = activeCalls.get(key);
      if (!call) throw new ApiError(404, 'Call not found');

      if (call.calleeAuthId !== me.authId && call.callerAuthId !== me.authId) {
        throw new ApiError(403, 'Not allowed to reject this call');
      }

      if (call.status !== 'RINGING') {
        throw new ApiError(409, 'Only ringing calls can be rejected');
      }

      call.status = 'REJECTED';
      removeActiveCall(key);

      const payload = toCallPayload(call, {
        reason: String(reason || 'rejected').trim() || 'rejected',
        rejectedByAuthId: me.authId,
      });

      emitToUser(call.callerAuthId, 'call:rejected', payload);
      emitToUser(call.calleeAuthId, 'call:rejected', payload);

      if (typeof ack === 'function') ack({ success: true });
    } catch (e) {
      if (typeof ack === 'function') {
        ack({ success: false, message: e.message || 'Failed to reject call' });
      }
    }
  });

  socket.on('call:end', ({ callId, reason } = {}, ack) => {
    try {
      const key = String(callId || '').trim();
      if (!key) throw new ApiError(400, 'callId is required');

      const call = activeCalls.get(key);
      if (!call) {
        if (typeof ack === 'function') ack({ success: true });
        return;
      }

      if (!isCallParticipant(call, me.authId)) {
        throw new ApiError(403, 'Not allowed to end this call');
      }

      call.status = 'ENDED';
      removeActiveCall(key);

      const payload = toCallPayload(call, {
        reason: String(reason || 'ended').trim() || 'ended',
        endedByAuthId: me.authId,
      });

      emitToUser(call.callerAuthId, 'call:ended', payload);
      emitToUser(call.calleeAuthId, 'call:ended', payload);

      if (typeof ack === 'function') ack({ success: true });
    } catch (e) {
      if (typeof ack === 'function') {
        ack({ success: false, message: e.message || 'Failed to end call' });
      }
    }
  });

  socket.on('call:signal', ({ callId, signal } = {}, ack) => {
    try {
      const key = String(callId || '').trim();
      if (!key) throw new ApiError(400, 'callId is required');
      if (signal == null) throw new ApiError(400, 'signal is required');

      const call = activeCalls.get(key);
      if (!call) throw new ApiError(404, 'Call not found');

      if (!isCallParticipant(call, me.authId)) {
        throw new ApiError(403, 'Not allowed to signal this call');
      }

      const senderIsCaller = call.callerAuthId === me.authId;
      const senderSocketMustMatch = senderIsCaller ? call.callerSocketId : call.calleeSocketId;
      if (senderSocketMustMatch && senderSocketMustMatch !== socket.id) {
        throw new ApiError(409, 'Call is active on another device');
      }

      const targetAuthId = senderIsCaller ? call.calleeAuthId : call.callerAuthId;
      const targetSocketId = senderIsCaller ? call.calleeSocketId : call.callerSocketId;

      const payload = {
        callId: key,
        fromAuthId: me.authId,
        signal,
      };

      if (targetSocketId) {
        io.to(targetSocketId).emit('call:signal', payload);
      } else {
        emitToUser(targetAuthId, 'call:signal', payload);
      }

      if (typeof ack === 'function') ack({ success: true });
    } catch (e) {
      if (typeof ack === 'function') {
        ack({ success: false, message: e.message || 'Failed to relay signal' });
      }
    }
  });

  socket.on('call:missed:list', async (_, ack) => {
    try {
      const items = await CallEvent.find({ calleeAuthId: me.authId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      if (typeof ack === 'function') {
        ack({ success: true, data: items });
      }
    } catch (e) {
      if (typeof ack === 'function') {
        ack({ success: false, message: e.message || 'Failed to list missed calls' });
      }
    }
  });
  }

  socket.on('disconnect', () => {
    logger.info('Socket disconnected', { authId: me?.authId });

    // Update presence
    setSocketOffline(me.authId, socket.id);

    if (CALLS_ENABLED && !isOnline(me.authId)) {
      handleUserFullyOffline(me.authId).catch((error) => {
        logger.error('Failed to process offline call cleanup', {
          authId: me.authId,
          message: error?.message,
        });
      });
    }
  });
});

const startServer = async () => {
  await connectDB();
  logger.info('MongoDB connection established');

  if (process.env.EUREKA_REGISTER_WITH_EUREKA !== 'false') {
    eurekaClient.start();
    logger.info('Eureka client started');
  }

  server.listen(PORT, () => {
    logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    logger.info(`Service: ${process.env.SERVICE_NAME || 'chat-service'}`);
  });

  const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        eurekaClient.stop();
        logger.info('Eureka client stopped');
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer().catch((err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
