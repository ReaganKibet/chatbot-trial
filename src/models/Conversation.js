// ================================
// src/models/Conversation.js - Conversation Tracking
// ================================
// Track conversation state and analytics
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  customerId: { type: String, required: true }, // Phone number
  sessionId: { type: String, required: true },
  
  // Conversation state
  currentFlow: { type: String, default: 'welcome' },
  currentStep: { type: String, default: 'start' },
  context: mongoose.Schema.Types.Mixed, // Dynamic context data
  
  // Messages in this session
  messages: [{
    timestamp: { type: Date, default: Date.now },
    direction: { type: String, enum: ['incoming', 'outgoing'], required: true },
    content: String,
    messageType: { type: String, enum: ['text', 'image', 'document', 'interactive'], default: 'text' },
    intent: String,
    confidence: Number,
    entities: mongoose.Schema.Types.Mixed
  }],
  
  // Analytics
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  duration: Number, // in seconds
  messageCount: { type: Number, default: 0 },
  satisfactionRating: Number,
  resolved: { type: Boolean, default: false },
  escalatedToHuman: { type: Boolean, default: false },
  
  // Outcome tracking
  outcome: {
    type: { type: String, enum: ['completed', 'abandoned', 'escalated', 'error'] },
    value: String, // What was accomplished
    products: [String], // Products viewed/purchased
    revenue: Number
  }
}, {
  timestamps: true
});

// Indexes
conversationSchema.index({ customerId: 1, createdAt: -1 });
conversationSchema.index({ sessionId: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);