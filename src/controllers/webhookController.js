// ================================
// src/controllers/webhookController.js - Twilio Webhook Handler
// ================================
// Handles incoming Twilio webhook events and message verification

// Fix SSL issues for development
if (process.env.NODE_ENV === 'development') {
  process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
  console.log('🔧 Development mode: SSL verification disabled');
}

const twilio = require('twilio');
const conversationService = require('../services/conversationService');

class WebhookController {
  constructor() {
    this.twilioSignature = twilio.validateRequest;
    
    // Initialize Twilio client for sending messages
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    console.log('✅ Twilio client initialized for webhook controller');
  }

  // Verify webhook during setup (for GET requests)
  verifyWebhook(req, res) {
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (token === process.env.WEBHOOK_VERIFY_TOKEN) {
      console.log('✅ Webhook verified successfully');
      res.status(200).send(challenge || 'OK');
    } else {
      console.error('❌ Webhook verification failed');
      res.sendStatus(403);
    }
  }

  // Handle incoming Twilio webhook (POST requests)
  async handleWebhook(req, res) {
    try {
      console.log('📨 Received Twilio webhook:', req.body);
  
      // Validate Twilio signature (optional but recommended)
      if (process.env.NODE_ENV === 'production') {
        if (!this.validateTwilioSignature(req)) {
          console.error('❌ Invalid Twilio signature');
          return res.status(403).send('Forbidden');
        }
      } else if (process.env.NODE_ENV === 'development' && process.env.STRICT_VALIDATION === 'true') {
        // Only validate in development if explicitly requested
        if (!this.validateTwilioSignature(req)) {
          console.log('⚠️ Development mode: Invalid signature (continuing anyway)');
        }
      }
      // Extract message data from Twilio webhook
      const { Body, From, To, MessageSid, MediaUrl0, MediaContentType0 } = req.body;
      
      if (!Body && !MediaUrl0) {
        console.log('⚠️ No message body or media, skipping');
        return res.status(200).send('OK');
      }

      // Extract phone number (remove whatsapp: prefix)
      const customerId = From.replace('whatsapp:', '');
      let message = Body || '';
      let messageType = 'text';

      // Handle media messages
      if (MediaUrl0) {
        messageType = MediaContentType0?.startsWith('image/') ? 'image' : 'document';
        message = message || `Received ${messageType}`;
      }

      console.log(`📨 Processing message from ${customerId}: ${message}`);

      // Process message asynchronously to respond quickly to Twilio
      // Process message asynchronously to respond quickly to Twilio
      setImmediate(async () => {
        try {
          console.log(`🤖 Processing message: "${message}" from ${customerId}`);
          
          // Use the webhookController's built-in response logic (bypassing broken conversationService)
          const autoResponse = this.generateAutoResponse(message);
          
          if (autoResponse) {
            console.log(`🎯 Generated auto response for message: ${message}`);
            await this.sendResponse(From, autoResponse.text, autoResponse.options);
          } else {
            console.log(`📝 No auto response found, sending default`);
            // Default response
            await this.sendResponse(From, "Hello! I received your message. How can I help you today?");
          }
          
        } catch (error) {
          console.error('❌ Error processing message:', error);
          // Send error response to user
          await this.sendResponse(From, "Sorry, I'm having trouble processing your message right now. Please try again later.");
        }
      });

      // Respond immediately to Twilio (required within 10 seconds)
      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      res.status(500).send('Internal Server Error');
    }
  }

  // Send response message back to user
  async sendResponse(to, messageBody, options = {}) {
    try {
      console.log(`📤 Sending response to ${to}: "${messageBody}"`);
      
      const messageData = {
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: to
      };

      // Check if using template
      if (options && options.useTemplate && options.contentSid) {
        messageData.contentSid = options.contentSid;
        if (options.contentVariables) {
          messageData.contentVariables = JSON.stringify(options.contentVariables);
        }
      } else {
        messageData.body = messageBody;
      }
      
      const message = await this.client.messages.create(messageData);
      
      console.log(`✅ Response sent successfully. SID: ${message.sid}`);
      return message;
      
    } catch (error) {
      console.error('❌ Error sending response:', error);
      throw error;
    }
  }

  // Generate simple automatic responses based on message content
  generateAutoResponse(messageBody) {
    if (!messageBody) return null;
    
    const message = messageBody.toLowerCase().trim();
    
    // Simple response logic - you can expand this
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return {
        text: `👋 Hello! Welcome to ${process.env.BUSINESS_NAME}. How can I help you today?`,
        options: null
      };
    }
    
    if (message.includes('appointment') || message === '2') {
      // Use template message for appointments if available
      return {
        text: 'Your appointment is coming up on July 21 at 3PM. Would you like to reschedule or get more details?',
        options: {
          useTemplate: true,
          contentSid: 'HXb5b62575e6e4ff6129ad7c8efe1f983e', // Your template ID
          contentVariables: {"1": "July 21", "2": "3PM"}
        }
      };
    }
    
    if (message.includes('help') || message.includes('menu')) {
      return {
        text: `🎯 How can I help you today?

1️⃣ View Products
2️⃣ Book Appointment  
3️⃣ Get Support
4️⃣ Business Hours
5️⃣ Contact Info

Reply with a number or describe what you need!`,
        options: null
      };
    }
    
    // Handle menu selections
    if (message === '1' || message.includes('product')) {
      return {
        text: `🛍️ Here are our popular products:

• Premium Service Package
• Basic Consultation
• Custom Solutions

Which one interests you? Or type "more products" to see our full catalog.`,
        options: null
      };
    }
    
    if (message === '3' || message.includes('support')) {
      return {
        text: `📞 Support Options:

🔸 Email: ${process.env.SUPPORT_EMAIL || 'support@business.com'}
🔸 Emergency: Call our main line
🔸 Live Chat: Available during business hours

How would you prefer to get help?`,
        options: null
      };
    }
    
    if (message === '4' || message.includes('hours') || message.includes('time')) {
      const startTime = process.env.BUSINESS_HOURS_START || '09:00';
      const endTime = process.env.BUSINESS_HOURS_END || '18:00';
      return {
        text: `🕒 Business Hours:

Monday - Friday: ${startTime} - ${endTime}
Saturday: 10AM - 4PM  
Sunday: Closed

Timezone: ${process.env.BUSINESS_TIMEZONE || 'Local Time'}`,
        options: null
      };
    }

    if (message === '5' || message.includes('contact')) {
      return {
        text: `📧 Contact Information:

🏢 ${process.env.BUSINESS_NAME}
📧 ${process.env.SUPPORT_EMAIL || 'support@business.com'}
🌐 Visit our website for more info

What else can I help you with?`,
        options: null
      };
    }
    
    // Default response for unrecognized messages
    return {
      text: `Thank you for your message! 🤖 

I'm processing your request: "${messageBody}"

Type "help" or "menu" to see what I can do right away, or our team will get back to you soon.`,
      options: null
    };
  }

  // Send appointment reminder (can be called from other parts of your app)
  async sendAppointmentReminder(phoneNumber, appointmentDetails = null) {
    try {
      const to = phoneNumber.startsWith('whatsapp:') ? phoneNumber : `whatsapp:${phoneNumber}`;
      const message = appointmentDetails || 'Your appointment is coming up on July 21 at 3PM';
      return await this.sendResponse(to, message);
    } catch (error) {
      console.error('❌ Error sending appointment reminder:', error);
      throw error;
    }
  }

  // Validate Twilio signature for security
  validateTwilioSignature(req) {
    try {
      const twilioSignature = req.headers['x-twilio-signature'];
      const webhookUrl = process.env.TWILIO_WEBHOOK_URL;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
  
      if (!twilioSignature || !webhookUrl || !authToken) {
        console.log('⚠️ Missing signature validation parameters');
        console.log('   - Signature present:', !!twilioSignature);
        console.log('   - Webhook URL set:', !!webhookUrl);
        console.log('   - Auth token set:', !!authToken);
        return false;
      }
  
      // BUILD THE FULL URL including query parameters if any
      const fullUrl = webhookUrl + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
  
      return twilio.validateRequest(
        authToken,
        twilioSignature,
        fullUrl,
        req.body
      );
    } catch (error) {
      console.error('Signature validation error:', error.message);
      return false;
    }
  }

  // Handle button responses (simulated since Twilio doesn't have native buttons)
  parseButtonResponse(message) {
    // Check if message is a number (button selection)
    const buttonNumber = parseInt(message.trim());
    if (!isNaN(buttonNumber) && buttonNumber > 0 && buttonNumber <= 10) {
      return {
        isButton: true,
        buttonIndex: buttonNumber - 1,
        originalMessage: message
      };
    }
    
    return {
      isButton: false,
      originalMessage: message
    };
  }
}

const testEndpoint = (req, res) => {
  res.json({
    status: 'OK',
    service: 'Twilio WhatsApp Chatbot',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    webhookUrl: process.env.TWILIO_WEBHOOK_URL
  });
  
}

module.exports = new WebhookController();