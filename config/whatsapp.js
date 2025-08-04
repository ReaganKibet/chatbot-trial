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

// ================================
// config/environment.js - Environment Configuration
// ================================
// Environment variables validation and defaults
const requiredEnvVars = [
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WEBHOOK_VERIFY_TOKEN',
  'MONGODB_URI',
  'REDIS_URL'
];

// Validate required environment variables
const validateEnvironment = () => {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
};

const config = {
  // App config
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  
  // Security
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  
  // External APIs
  openaiApiKey: process.env.OPENAI_API_KEY,
  dialogflowProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  
  // Business settings
  businessName: process.env.BUSINESS_NAME || 'Your Business',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@yourbusiness.com',
  businessHours: {
    start: process.env.BUSINESS_HOURS_START || '09:00',
    end: process.env.BUSINESS_HOURS_END || '18:00',
    timezone: process.env.BUSINESS_TIMEZONE || 'UTC'
  }
};

module.exports = { config, validateEnvironment };