// ================================
// src/routes/api.js - Internal API Routes
// ================================
// API routes for admin panel and internal operations
const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Conversation = require('../models/Conversation');
const analyticsService = require('../services/analyticsService');
const catalogService = require('../services/catalogService');
const queueService = require('../services/queueService');

// Customer management endpoints
router.get('/customers', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const customers = await Customer.find()
      .sort({ lastActive: -1 })
      .skip(skip)
      .limit(limit)
      .select('-conversationHistory'); // Exclude large arrays

    const total = await Customer.countDocuments();

    res.json({
      customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Customer details
router.get('/customers/:phoneNumber', async (req, res) => {
  try {
    const customer = await Customer.findOne({ 
      phoneNumber: req.params.phoneNumber 
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get recent conversations
    const conversations = await Conversation.find({ 
      customerId: req.params.phoneNumber 
    })
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      customer,
      conversations
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Product management endpoints
router.get('/products', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = { isActive: true };
    
    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const products = await Product.find(query)
      .sort({ popularity: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Add new product
router.post('/products', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    
    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
router.put('/products/:productId', async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { productId: req.params.productId },
      req.body,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Analytics endpoints
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const stats = await analyticsService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/analytics/trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const trends = await analyticsService.getConversationTrends(days);
    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Queue management endpoints
router.get('/queue/stats', async (req, res) => {
  try {
    const stats = await queueService.getQueueStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({ error: 'Failed to fetch queue stats' });
  }
});

// Conversations endpoint
router.get('/conversations', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name phoneNumber');

    const total = await Conversation.countDocuments();

    res.json({
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Test endpoint for development
router.post('/test/message', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        error: 'phoneNumber and message are required' 
      });
    }

    const conversationService = require('../services/conversationService');
    const response = await conversationService.processMessage(
      phoneNumber, 
      message, 
      'text'
    );

    res.json({
      message: 'Test message processed',
      response
    });
  } catch (error) {
    console.error('Error processing test message:', error);
    res.status(500).json({ error: 'Failed to process test message' });
  }
});

module.exports = router;