// ================================
// dev-webhook-server.js - Complete Development Webhook Server
// ================================
const axios = require('axios');
const twilio = require('twilio');
const express = require('express');
require('dotenv').config();

// Fix SSL issues
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Ngrok bypass headers
const ngrokHeaders = {
  'ngrok-skip-browser-warning': 'true',
  'User-Agent': 'WebhookTester/1.0',
  'Accept': 'application/json, text/plain, */*',
  'Cache-Control': 'no-cache'
};

// Debug function (referenced in your code)
async function debugWebhook() {
  console.log('🔍 Running webhook debug...');
  // Add your debug logic here if needed
}

// Quick test function (referenced in your code)
async function quickTest() {
  console.log('🧪 Running quick test...');
  // Add your quick test logic here if needed
}

// ================================
// Development webhook bypass for testing
// ================================
function createDevWebhookHandler() {
  const app = express();
  
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  
  // Test endpoint
  app.get('/', (req, res) => {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  app.get('/webhook', (req, res) => {
    res.json({
      status: 'OK',
      service: 'Twilio WhatsApp Chatbot',
      timestamp: new Date().toISOString()
    });
  });
  
  // Simple webhook for testing (bypasses signature validation)
  app.post('/webhook', (req, res) => {
    console.log('📨 Webhook received:', req.body);
    
    // Simple response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>Hello! I received your message: "${req.body.Body || 'No message'}"</Message>
</Response>`;
    
    res.type('text/xml');
    res.send(twiml);
  });
  
  return app;
}

// Run the appropriate test
if (require.main === module) {
  const testType = process.argv[2] || 'debug';
  
  if (testType === 'quick') {
    quickTest().catch(console.error);
  } else if (testType === 'server') {
    const app = createDevWebhookHandler();
    const PORT = 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Development webhook server running on port ${PORT}`);
      console.log('🔗 Use this for testing webhook responses');
      console.log('💡 This server bypasses signature validation for testing');
      console.log('\n📋 Available endpoints:');
      console.log('   GET  / - Health check');
      console.log('   GET  /webhook - Webhook info');
      console.log('   POST /webhook - Process messages');
      console.log('\n🧪 To test:');
      console.log('   1. Make sure this server is running');
      console.log('   2. Update Twilio webhook to: https://your-ngrok-url.ngrok-free.app/webhook');
      console.log('   3. Send messages to your WhatsApp sandbox number');
    });
  } else {
    debugWebhook().catch(console.error);
  }
}