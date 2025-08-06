// ================================
// config/whatsapp.js - WhatsApp API Configuration
// ================================
// WhatsApp Business API credentials and endpoints
module.exports = {
  apiUrl: `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  webhookVerifyToken: process.env.WEBHOOK_VERIFY_TOKEN,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  apiVersion: 'v18.0',
  
  // Message templates
  templates: {
    welcome: process.env.WELCOME_TEMPLATE_NAME || 'welcome_message',
    orderConfirmation: process.env.ORDER_TEMPLATE_NAME || 'order_confirmation'
  },
  
  // Rate limits
  rateLimits: {
    messagesPerSecond: 100,
    messagesPerDay: 100000
  }
};

