// ================================
// src/middleware/authentication.js - Webhook Authentication
// ================================
// Validates WhatsApp webhook requests for security
const crypto = require('crypto');

const authenticateWebhook = (req, res, next) => {
  try {
    // Skip authentication in development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    const signature = req.headers['x-hub-signature-256'];
    const secret = process.env.WHATSAPP_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return res.status(401).json({ error: 'Missing signature or secret' });
    }

    // Calculate HMAC SHA256 signature
    const payload = JSON.stringify(req.body);
    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (signature !== expectedSignature) {
      return res.status(403).json({ error: 'Invalid signature' });
    }

    next();
  } catch (error) {
    console.error('Webhook authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = authenticateWebhook