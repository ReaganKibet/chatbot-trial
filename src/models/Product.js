// ================================
// src/models/Product.js - Product Information Model
// ================================
// Product catalog with AI recommendation features
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  
  // Pricing
  price: { type: Number, required: true },
  originalPrice: Number, // For discounts
  currency: { type: String, default: 'USD' },
  
  // Categorization
  category: { type: String, required: true },
  subcategory: String,
  brand: String,
  tags: [String], // For search and recommendations
  
  // Product details
  specifications: mongoose.Schema.Types.Mixed,
  features: [String],
  images: [String], // Image URLs
  
  // Inventory
  inStock: { type: Boolean, default: true },
  quantity: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  
  // AI and recommendations
  popularity: { type: Number, default: 0 }, // View/purchase count
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, default: 0 },
  
  // Related products for recommendations
  relatedProducts: [String], // Product IDs
  complementaryProducts: [String], // Product IDs
  
  // SEO and search
  keywords: [String],
  searchTerms: [String], // What users search for this product
  
  // Status
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for search and recommendations
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ popularity: -1 });
productSchema.index({ price: 1 });

module.exports = mongoose.model('Product', productSchema);