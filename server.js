// ================================
// server.js - Main Application Entry Point (Fixed Paths & Proxy)
// ================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const errorHandler = require('./src/middleware/errorHandler');
require('dotenv').config();

const app = express();

// Connect to database
connectDB();

// Trust proxy for ngrok and other reverse proxies (MUST be before rate limiting)
app.set('trust proxy', 1);

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for webhook endpoint (now with proper proxy support)
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for development/testing
  skip: (req) => process.env.NODE_ENV === 'development' && req.ip === '::1'
});

// Check service dependencies first
console.log('🔍 Checking service dependencies...');

// Check each service used in api.js
const services = [
  { name: 'analyticsService', path: './src/services/analyticsService' },
  { name: 'catalogService', path: './src/services/catalogService' },
  { name: 'queueService', path: './src/services/queueService' }
];

for (const service of services) {
  try {
    const serviceModule = require(service.path);
    console.log(`✅ ${service.name} loaded:`, typeof serviceModule);
  } catch (error) {
    console.error(`❌ Error loading ${service.name}:`, error.message);
  }
}

// Check models
const models = [
  { name: 'Customer', path: './src/models/Customer' },
  { name: 'Product', path: './src/models/Product' },
  { name: 'Conversation', path: './src/models/Conversation' }
];

for (const model of models) {
  try {
    const modelModule = require(model.path);
    console.log(`✅ ${model.name} model loaded:`, typeof modelModule);
  } catch (error) {
    console.error(`❌ Error loading ${model.name} model:`, error.message);
  }
}

// Check webhook controller
try {
  const webhookController = require('./src/controllers/webhookController');
  console.log('✅ webhookController loaded:', typeof webhookController);
} catch (error) {
  console.error('❌ Error loading webhookController:', error.message);
}

console.log('🔍 Loading route modules...');

// Load routes with individual error handling
try {
  const webhookRouter = require('./src/routes/webhook');
  console.log('✅ Webhook router loaded:', typeof webhookRouter);
  if (typeof webhookRouter === 'function') {
    app.use('/webhook', webhookLimiter, webhookRouter);
  } else {
    console.error('❌ Webhook router is not a function:', webhookRouter);
  }
} catch (error) {
  console.error('❌ Error loading webhook router:', error.message);
  console.error('Stack trace:', error.stack);
}

try {
  const apiRouter = require('./src/routes/api');
  console.log('✅ API router loaded:', typeof apiRouter);
  if (typeof apiRouter === 'function') {
    app.use('/api', apiRouter);
  } else {
    console.error('❌ API router is not a function:', apiRouter);
  }
} catch (error) {
  console.error('❌ Error loading API router:', error.message);
  console.error('Stack trace:', error.stack);
}

try {
  const adminRouter = require('./src/routes/admin');
  console.log('✅ Admin router loaded:', typeof adminRouter);
  if (typeof adminRouter === 'function') {
    app.use('/admin', adminRouter);
  } else {
    console.error('❌ Admin router is not a function:', adminRouter);
  }
} catch (error) {
  console.error('❌ Error loading admin router:', error.message);
  console.error('Stack trace:', error.stack);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint for basic server info
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🤖 WhatsApp Chatbot Server',
    status: 'Running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      webhook: '/webhook (POST)',
      api: '/api/*',
      admin: '/admin/*'
    },
    environment: process.env.NODE_ENV || 'development',
    documentation: 'Check /health for detailed status'
  });
});

// Test webhook endpoint (for development)
if (process.env.NODE_ENV === 'development') {
  app.get('/test-webhook', (req, res) => {
    res.status(200).json({
      message: 'Webhook endpoint is accessible',
      webhookUrl: `${process.env.BASE_URL}/webhook`,
      timestamp: new Date().toISOString()
    });
  });
}

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Chatbot server running on port ${PORT}`);
  console.log(`📱 Webhook URL: ${process.env.BASE_URL}/webhook`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Trust proxy: ${app.get('trust proxy')}`);
});