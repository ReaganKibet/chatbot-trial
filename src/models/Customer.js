// ================================
// src/models/Customer.js - Customer Data Model
// ================================
// Customer schema with conversation history and preferences
const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  phoneNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  name: { 
    type: String,
    trim: true
  },
  email: { 
    type: String,
    trim: true,
    lowercase: true
  },
  
  // Customer preferences for AI recommendations
  preferences: {
    language: { type: String, default: 'en' },
    categories: [String], // Preferred product categories
    priceRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 10000 }
    },
    brands: [String], // Preferred brands
    notifications: { type: Boolean, default: true }
  },
  
  // AI recommendation data
  profile: {
    purchaseHistory: [{
      productId: String,
      category: String,
      price: Number,
      purchaseDate: { type: Date, default: Date.now }
    }],
    browsingHistory: [{
      productId: String,
      category: String,
      viewedAt: { type: Date, default: Date.now }
    }],
    interests: [String], // AI-derived interests
    behavior: {
      averageOrderValue: { type: Number, default: 0 },
      preferredShoppingTime: String,
      frequency: String // frequent, occasional, rare
    }
  },
  
  // Conversation tracking
  conversationHistory: [{
    timestamp: { type: Date, default: Date.now },
    message: String,
    intent: String,
    confidence: Number,
    response: String,
    satisfaction: Number // 1-5 rating if provided
  }],
  
  // Customer status
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'blocked'], 
    default: 'active' 
  },
  isVIP: { type: Boolean, default: false },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
  lastPurchase: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
customerSchema.index({ phoneNumber: 1 });
customerSchema.index({ lastActive: -1 });
customerSchema.index({ 'preferences.categories': 1 });

// Virtual for customer lifetime value
customerSchema.virtual('lifetimeValue').get(function() {
  return this.profile.purchaseHistory.reduce((total, purchase) => total + purchase.price, 0);
});

module.exports = mongoose.model('Customer', customerSchema);