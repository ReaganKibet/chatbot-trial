// ================================
// src/routes/webhook.js - Twilio Webhook Routes (FIXED)
// ================================
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Twilio webhook message handling (POST) - This is what Twilio uses
router.post('/', webhookController.handleWebhook.bind(webhookController));

// Optional: Simple GET endpoint for testing connectivity
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'Twilio WhatsApp Webhook',
    message: 'Webhook endpoint is ready for POST requests',
    timestamp: new Date().toISOString()
  });
});

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    service: 'Twilio WhatsApp Chatbot',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;