// ================================
// server.js - Main Application Entry Point
// ================================
// Initializes Express server, middleware, and routes
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

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting for webhook endpoint
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP'
});

// Routes
app.use('/webhook', webhookLimiter, require('./src/routes/webhook'));
app.use('/api', require('./src/routes/api'));
app.use('/admin', require('./src/routes/admin'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 WhatsApp Chatbot server running on port ${PORT}`);
  console.log(`📱 Webhook URL: ${process.env.BASE_URL}/webhook`);
});

