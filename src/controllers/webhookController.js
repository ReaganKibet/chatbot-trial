// ================================
// src/controllers/webhookController.js - WhatsApp Webhook Handler
// ================================
// Handles incoming WhatsApp webhook events and message verification
const crypto = require('crypto');
const conversationService = require('../services/conversationService');
const whatsappConfig = require('../../config/whatsapp');

class WebhookController {
  // Verify webhook during setup
  verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === whatsappConfig.webhookVerifyToken) {
      console.log('✅ Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.error('❌ Webhook verification failed');
      res.sendStatus(403);
    }
  }

  // Handle incoming webhook events
  async handleWebhook(req, res) {
    try {
      const body = req.body;

      // Verify webhook signature for security
      if (!this.verifySignature(req)) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Process webhook entry
      if (body.object === 'whatsapp_business_account') {
        body.entry?.forEach(async (entry) => {
          const changes = entry.changes?.[0];
          
          if (changes?.field === 'messages') {
            await this.processMessageEvent(changes.value);
          }
        });
      }

      // Always respond with 200 to acknowledge receipt
      res.status(200).json({ status: 'success' });

    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Verify webhook signature for security
  verifySignature(req) {
    const signature = req.headers['x-hub-signature-256'];
    
    if (!signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET || '')
      .update(JSON.stringify(req.body))
      .digest('hex');

    const signatureHash = signature.split('sha256=')[1];
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signatureHash, 'hex')
    );
  }

  // Process individual message events
  async processMessageEvent(messageData) {
    try {
      const { messages, contacts } = messageData;

      if (!messages || messages.length === 0) {
        return;
      }

      // Process each message
      for (const message of messages) {
        const customerId = message.from;
        const messageId = message.id;
        const timestamp = message.timestamp;

        // Extract message content based on type
        let messageContent = '';
        let messageType = 'text';

        switch (message.type) {
          case 'text':
            messageContent = message.text?.body || '';
            messageType = 'text';
            break;

          case 'interactive':
            if (message.interactive?.type === 'button_reply') {
              messageContent = message.interactive.button_reply.id;
              messageType = 'button';
            } else if (message.interactive?.type === 'list_reply') {
              messageContent = message.interactive.list_reply.id;
              messageType = 'list_selection';
            }
            break;

          case 'image':
            messageContent = message.image?.caption || 'Image received';
            messageType = 'image';
            break;

          case 'document':
            messageContent = message.document?.caption || 'Document received';
            messageType = 'document';
            break;

          default:
            messageContent = `Received ${message.type} message`;
            messageType = message.type;
        }

        // Skip empty messages
        if (!messageContent.trim()) {
          continue;
        }

        console.log(`📨 Processing message from ${customerId}: ${messageContent}`);

        // Mark message as read
        await this.markMessageAsRead(messageId);

        // Process message through conversation service
        await conversationService.processMessage(customerId, messageContent, messageType);
      }

    } catch (error) {
      console.error('❌ Error processing message event:', error);
    }
  }

  // Mark message as read
  async markMessageAsRead(messageId) {
    try {
      const whatsappService = require('../services/whatsappService');
      await whatsappService.markAsRead(messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }
}

module.exports = new WebhookController();