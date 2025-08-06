// ================================
// src/services/whatsappService.js - Twilio WhatsApp Integration (FIXED)
// ================================
const twilio = require('twilio');

class WhatsAppService {
  constructor() {
    try {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
      
      console.log('✅ Twilio WhatsApp client initialized');
      console.log(`📱 From number: ${this.fromNumber}`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Twilio client:', error.message);
      throw error;
    }
  }

  // Send text message
  async sendTextMessage(to, text) {
    try {
      // Validate inputs
      if (!to || !text) {
        throw new Error(`Missing required parameters: to=${to}, text=${text}`);
      }

      // Ensure 'to' number has whatsapp: prefix
      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      
      console.log(`📤 Sending Twilio message to ${toNumber}: "${text.substring(0, 50)}..."`);
      
      const message = await this.client.messages.create({
        body: text,
        from: this.fromNumber,
        to: toNumber
      });

      console.log(`✅ Twilio message sent successfully! SID: ${message.sid}`);
      return message;
      
    } catch (error) {
      console.error('❌ Twilio API Error:', {
        message: error.message,
        code: error.code,
        status: error.status
      });
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  // Send image with caption
  async sendImage(to, imageUrl, caption = '') {
    try {
      if (!to || !imageUrl) {
        throw new Error(`Missing required parameters: to=${to}, imageUrl=${imageUrl}`);
      }

      const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      
      console.log(`📷 Sending image to ${toNumber}: ${imageUrl}`);
      
      const message = await this.client.messages.create({
        body: caption,
        from: this.fromNumber,
        to: toNumber,
        mediaUrl: [imageUrl]
      });

      console.log(`✅ Image sent successfully! SID: ${message.sid}`);
      return message;
      
    } catch (error) {
      console.error('❌ Twilio Media Error:', error);
      throw new Error(`Failed to send image: ${error.message}`);
    }
  }

  // Send document
  async sendDocument(to, documentUrl, filename, caption = '') {
    return this.sendImage(to, documentUrl, `${caption}\n📎 ${filename}`);
  }

  // Simulate interactive buttons (Twilio doesn't support native buttons)
  async sendInteractiveButtons(to, bodyText, buttons, header = null) {
    let message = header ? `*${header}*\n\n${bodyText}\n\n` : `${bodyText}\n\n`;
    
    buttons.forEach((button, index) => {
      message += `${index + 1}️⃣ ${button.title}\n`;
    });
    
    message += '\n💬 *Reply with the number of your choice*';
    
    return this.sendTextMessage(to, message);
  }

  // Simulate interactive list (Twilio doesn't support native lists)
  async sendInteractiveList(to, bodyText, buttonText, sections) {
    let message = `${bodyText}\n\n`;
    let counter = 1;
    
    sections.forEach(section => {
      message += `📋 *${section.title}*\n`;
      section.rows.forEach(row => {
        message += `${counter}️⃣ ${row.title}\n`;
        if (row.description) {
          message += `   └ ${row.description}\n`;
        }
        counter++;
      });
      message += '\n';
    });
    
    message += '💬 *Reply with the number of your choice*';
    return this.sendTextMessage(to, message);
  }

  // Mark message as read (Twilio doesn't support this, so we'll just log)
  async markAsRead(messageId) {
    console.log(`📖 Message ${messageId} marked as read (simulated)`);
  }

  // Send any type of message (compatibility method) - FIXED VERSION
  async sendMessage(to, messageData) {
    console.log('🔍 sendMessage called with:', {
      to: to,
      messageType: typeof messageData,
      messageData: messageData
    });

    try {
      // Handle string messages (simple text)
      if (typeof messageData === 'string') {
        return this.sendTextMessage(to, messageData);
      }

      // Handle object messages
      if (typeof messageData === 'object' && messageData !== null) {
        
        // Handle text type
        if (messageData.type === 'text' && messageData.text?.body) {
          return this.sendTextMessage(to, messageData.text.body);
        }
        
        // Handle image type
        if (messageData.type === 'image' && messageData.image?.link) {
          return this.sendImage(to, messageData.image.link, messageData.image.caption);
        }
        
        // Handle interactive type
        if (messageData.type === 'interactive' && messageData.interactive) {
          if (messageData.interactive.type === 'button') {
            return this.sendInteractiveButtons(
              to, 
              messageData.interactive.body?.text || 'Choose an option:',
              messageData.interactive.action?.buttons?.map(btn => ({ title: btn.reply?.title || btn.title })) || []
            );
          } else if (messageData.interactive.type === 'list') {
            return this.sendInteractiveList(
              to,
              messageData.interactive.body?.text || 'Select from list:',
              messageData.interactive.action?.button || 'Options',
              messageData.interactive.action?.sections || []
            );
          }
        }
        
        // Handle direct text property
        if (messageData.text) {
          return this.sendTextMessage(to, messageData.text);
        }
        
        // Handle body property
        if (messageData.body) {
          return this.sendTextMessage(to, messageData.body);
        }
        
        // If we can't parse the object, send as simple text
        console.log('⚠️  Unknown message format, converting to string');
        return this.sendTextMessage(to, JSON.stringify(messageData, null, 2));
      }

      // Fallback for other types
      throw new Error(`Invalid message data type: ${typeof messageData}`);
      
    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      console.error('📝 Original messageData:', messageData);
      
      // Send error fallback message
      try {
        return this.sendTextMessage(to, 'Sorry, I encountered an error processing your message. Please try again.');
      } catch (fallbackError) {
        console.error('❌ Even fallback message failed:', fallbackError);
        throw error;
      }
    }
  }

  // Test method to verify service is working
  async testConnection() {
    try {
      console.log('🧪 Testing Twilio connection...');
      
      // Try to get account info
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      console.log('✅ Twilio connection successful!');
      console.log(`📊 Account: ${account.friendlyName} (${account.status})`);
      
      return true;
    } catch (error) {
      console.error('❌ Twilio connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = WhatsAppService;