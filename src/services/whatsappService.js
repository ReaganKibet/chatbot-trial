// ================================
// src/services/whatsappService.js - WhatsApp API Integration
// ================================
// Core WhatsApp messaging functionality
const axios = require('axios');
const whatsappConfig = require('../../config/whatsapp');

class WhatsAppService {
  constructor() {
    this.apiUrl = whatsappConfig.apiUrl;
    this.accessToken = whatsappConfig.accessToken;
    this.headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  }

  // Send any type of message
  async sendMessage(to, messageData) {
    try {
      const response = await axios.post(`${this.apiUrl}/messages`, {
        messaging_product: 'whatsapp',
        to: to,
        ...messageData
      }, { headers: this.headers });

      console.log(`📤 Message sent to ${to}:`, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ WhatsApp API Error:', error.response?.data || error.message);
      throw new Error(`Failed to send message: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Send text message
  async sendTextMessage(to, text) {
    return this.sendMessage(to, {
      type: 'text',
      text: { body: text }
    });
  }

  // Send interactive buttons
  async sendInteractiveButtons(to, bodyText, buttons, header = null) {
    const interactive = {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((button, index) => ({
          type: 'reply',
          reply: {
            id: button.id || `btn_${index}`,
            title: button.title.substring(0, 20) // WhatsApp limit
          }
        }))
      }
    };

    if (header) {
      interactive.header = { type: 'text', text: header };
    }

    return this.sendMessage(to, {
      type: 'interactive',
      interactive
    });
  }

  // Send interactive list
  async sendInteractiveList(to, bodyText, buttonText, sections) {
    return this.sendMessage(to, {
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections: sections.map(section => ({
            title: section.title,
            rows: section.rows.map(row => ({
              id: row.id,
              title: row.title.substring(0, 24), // WhatsApp limit
              description: row.description?.substring(0, 72) // WhatsApp limit
            }))
          }))
        }
      }
    });
  }

  // Send image with caption
  async sendImage(to, imageUrl, caption = '') {
    return this.sendMessage(to, {
      type: 'image',
      image: {
        link: imageUrl,
        caption: caption
      }
    });
  }

  // Send document
  async sendDocument(to, documentUrl, filename, caption = '') {
    return this.sendMessage(to, {
      type: 'document',
      document: {
        link: documentUrl,
        filename: filename,
        caption: caption
      }
    });
  }

  // Mark message as read
  async markAsRead(messageId) {
    try {
      await axios.post(`${this.apiUrl}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      }, { headers: this.headers });
    } catch (error) {
      console.error('Error marking message as read:', error.response?.data);
    }
  }
}

module.exports = new WhatsAppService();