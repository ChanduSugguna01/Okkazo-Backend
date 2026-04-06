const mongoose = require('mongoose');

const CallEventSchema = new mongoose.Schema(
  {
    callId: { type: String, required: true, index: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    eventId: { type: String, default: '', index: true },
    callerAuthId: { type: String, required: true, index: true },
    calleeAuthId: { type: String, required: true, index: true },
    callType: { type: String, enum: ['voice', 'video'], default: 'voice' },
    status: { type: String, enum: ['MISSED', 'TIMED_OUT'], default: 'MISSED' },
    reason: { type: String, default: 'OFFLINE' },
    pushStatus: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING', index: true },
    pushQueuedAt: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

CallEventSchema.index({ calleeAuthId: 1, pushStatus: 1, createdAt: -1 });

module.exports = mongoose.model('CallEvent', CallEventSchema);