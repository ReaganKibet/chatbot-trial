// ================================
// src/routes/webhook.js - WhatsApp Webhook Routes
// ================================
// Express routes for WhatsApp webhook verification and message handling
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { body, validationResult } = require('express-validator');

// Webhook verification (GET) - for initial setup
router.get('/', webhookController.verifyWebhook.bind(webhookController));

// Webhook message handling (POST)
router.post('/', 
  // Request validation
  [
    body('object').equals('whatsapp_business_account'),
    body('entry').isArray().notEmpty()
  ],
  async (req, res) => {
    // Check validation results
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Webhook validation failed:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    // Handle webhook
    await webhookController.handleWebhook(req, res);
  }
);

module.exports = router;

