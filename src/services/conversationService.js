// ================================
// src/services/conversationService.js - Conversation Flow Manager
// ================================
// Manages conversation state and determines responses
const nlpService = require('./nlpService');
const catalogService = require('./catalogService');
const whatsappService = require('./whatsappService');
const Customer = require('../models/Customer');
const Conversation = require('../models/Conversation');
const responses = require('../../data/responses.json');

class ConversationService {
  constructor() {
    this.flows = {
      welcome: this.handleWelcomeFlow.bind(this),
      browse_catalog: this.handleBrowseFlow.bind(this),
      product_search: this.handleSearchFlow.bind(this),
      product_details: this.handleProductDetailsFlow.bind(this),
      recommendations: this.handleRecommendationsFlow.bind(this),
      faq: this.handleFAQFlow.bind(this),
      support: this.handleSupportFlow.bind(this),
      fallback: this.handleFallbackFlow.bind(this)
    };
  }

  // Main conversation processor
  async processMessage(customerId, message, messageType = 'text') {
    try {
      // Get or create customer
      const customer = await this.getOrCreateCustomer(customerId);
      
      // Get current conversation session
      const conversation = await this.getCurrentConversation(customerId);
      
      // Process message with NLP
      const nlpResult = await nlpService.detectIntent(message, customerId);
      
      // Log incoming message
      await this.logMessage(conversation._id, 'incoming', message, messageType, nlpResult);
      
      // Determine conversation flow
      const flow = this.determineFlow(nlpResult, conversation.context);
      
      // Process with appropriate flow handler
      const response = await this.flows[flow](customer, nlpResult, conversation.context, message);
      
      // Update conversation context
      await this.updateConversationContext(conversation._id, response.context || {});
      
      // Log outgoing response
      await this.logMessage(conversation._id, 'outgoing', response.text, response.type || 'text');
      
      // Send response via WhatsApp
      await this.sendResponse(customerId, response);
      
      return response;
      
    } catch (error) {
      console.error('Error processing message:', error);
      const fallbackResponse = {
        text: "I'm sorry, I encountered an error. Please try again or contact our support team.",
        type: 'text'
      };
      await this.sendResponse(customerId, fallbackResponse);
      return fallbackResponse;
    }
  }

  // Determine which flow to use based on intent and context
  determineFlow(nlpResult, context) {
    const { intent, confidence } = nlpResult;
    
    // High confidence intents
    if (confidence > 0.7) {
      switch (intent) {
        case 'greeting':
        case 'get_started':
          return 'welcome';
        case 'browse_catalog':
        case 'show_products':
          return 'browse_catalog';
        case 'search_product':
        case 'find_product':
          return 'product_search';
        case 'product_details':
        case 'more_info':
          return 'product_details';
        case 'get_recommendations':
        case 'suggest_products':
          return 'recommendations';
        case 'faq':
        case 'help':
          return 'faq';
        case 'contact_support':
        case 'human_agent':
          return 'support';
        default:
          return 'fallback';
      }
    }
    
    // Medium confidence - check context
    if (confidence > 0.4 && context.currentFlow) {
      return context.currentFlow;
    }
    
    // Low confidence - fallback
    return 'fallback';
  }

  // Welcome flow handler
  async handleWelcomeFlow(customer, nlpResult, context, message) {
    const businessInfo = require('../../data/business-info.json');
    
    const welcomeText = `👋 Hello${customer.name ? ` ${customer.name}` : ''}! Welcome to ${businessInfo.name}!\n\n` +
      `I'm your AI assistant and I'm here to help you:\n` +
      `🛍️ Browse our products\n` +
      `🔍 Find specific items\n` +
      `💡 Get personalized recommendations\n` +
      `❓ Answer your questions\n\n` +
      `What would you like to do today?`;

    const buttons = [
      { id: 'browse_catalog', title: '🛍️ Browse Products' },
      { id: 'get_recommendations', title: '💡 Recommendations' },
      { id: 'search_product', title: '🔍 Search Products' },
      { id: 'faq', title: '❓ Help & FAQ' }
    ];

    return {
      text: welcomeText,
      type: 'interactive_buttons',
      buttons,
      context: { currentFlow: 'welcome' }
    };
  }

  // Browse catalog flow handler
  async handleBrowseFlow(customer, nlpResult, context, message) {
    // Get available categories
    const categories = await catalogService.getCategories();
    
    if (context.selectedCategory) {
      // Show products in selected category
      const products = await catalogService.getProductsByCategory(
        context.selectedCategory, 
        customer.phoneNumber, 
        6
      );
      
      if (products.length === 0) {
        return {
          text: `Sorry, no products found in ${context.selectedCategory} category.`,
          type: 'text',
          context: { currentFlow: 'browse_catalog', selectedCategory: null }
        };
      }
      
      // Create product list
      const sections = [{
        title: context.selectedCategory,
        rows: products.map(product => ({
          id: `product_${product.productId}`,
          title: product.name.substring(0, 24),
          description: `${product.price} - ${product.description.substring(0, 50)}...`
        }))
      }];
      
      return {
        text: `Here are our ${context.selectedCategory} products:`,
        type: 'interactive_list',
        buttonText: 'View Products',
        sections,
        context: { currentFlow: 'product_details', selectedCategory: context.selectedCategory }
      };
    } else {
      // Show categories
      const sections = [{
        title: 'Product Categories',
        rows: categories.map(category => ({
          id: `category_${category.name}`,
          title: category.name,
          description: `${category.count} products available`
        }))
      }];
      
      return {
        text: 'Which category would you like to explore?',
        type: 'interactive_list',
        buttonText: 'Browse Categories',
        sections,
        context: { currentFlow: 'browse_catalog' }
      };
    }
  }

  // Product search flow handler
  async handleSearchFlow(customer, nlpResult, context, message) {
    const { entities } = nlpResult;
    
    // Extract search query
    const searchQuery = entities.products.length > 0 ? entities.products[0] : message;
    
    if (!searchQuery || searchQuery.length < 2) {
      return {
        text: 'Please tell me what product you\'re looking for. For example: "smartphone", "laptop", "headphones"',
        type: 'text',
        context: { currentFlow: 'product_search' }
      };
    }
    
    // Search products
    const products = await catalogService.searchProducts(searchQuery, customer.phoneNumber, { limit: 6 });
    
    if (products.length === 0) {
      const suggestions = await catalogService.getRecommendations(customer.phoneNumber, { limit: 3 });
      
      let responseText = `Sorry, I couldn't find any products matching "${searchQuery}".`;
      
      if (suggestions.length > 0) {
        responseText += '\n\nBut you might like these instead:';
        const suggestionButtons = suggestions.map(product => ({
          id: `product_${product.productId}`,
          title: product.name.substring(0, 20)
        }));
        
        return {
          text: responseText,
          type: 'interactive_buttons',
          buttons: suggestionButtons,
          context: { currentFlow: 'product_details' }
        };
      }
      
      return {
        text: responseText + '\n\nTry searching for something else or browse our categories.',
        type: 'text',
        context: { currentFlow: 'welcome' }
      };
    }
    
    // Show search results
    const sections = [{
      title: `Search Results for "${searchQuery}"`,
      rows: products.map(product => ({
        id: `product_${product.productId}`,
        title: product.name.substring(0, 24),
        description: `${product.price} - ${product.description.substring(0, 50)}...`
      }))
    }];
    
    return {
      text: `Found ${products.length} products matching "${searchQuery}":`,
      type: 'interactive_list',
      buttonText: 'View Products',
      sections,
      context: { currentFlow: 'product_details', searchQuery }
    };
  }

  // Product details flow handler
  async handleProductDetailsFlow(customer, nlpResult, context, message) {
    // Extract product ID from message or context
    let productId = null;
    
    if (message.startsWith('product_')) {
      productId = message.replace('product_', '');
    } else if (context.selectedProduct) {
      productId = context.selectedProduct;
    }
    
    if (!productId) {
      return {
        text: 'Please select a product to view details.',
        type: 'text',
        context: { currentFlow: 'browse_catalog' }
      };
    }
    
    try {
      // Get product details
      const product = await catalogService.getProductDetails(productId);
      
      // Log product view for recommendations
      await catalogService.logProductView(customer.phoneNumber, productId);
      
      // Build product details message
      let detailsText = `📱 *${product.name}*\n\n`;
      detailsText += `💰 Price: ${product.price}`;
      if (product.originalPrice && product.originalPrice > product.price) {
        const discount = Math.round((1 - product.price / product.originalPrice) * 100);
        detailsText += ` ~~${product.originalPrice}~~ (${discount}% off!)`;
      }
      detailsText += `\n\n📝 ${product.description}\n\n`;
      
      if (product.features && product.features.length > 0) {
        detailsText += `✨ *Key Features:*\n`;
        product.features.slice(0, 5).forEach(feature => {
          detailsText += `• ${feature}\n`;
        });
        detailsText += '\n';
      }
      
      detailsText += `📦 ${product.inStock ? 'In Stock' : 'Out of Stock'}\n`;
      if (product.rating > 0) {
        detailsText += `⭐ Rating: ${product.rating}/5 (${product.reviewCount} reviews)\n`;
      }
      
      // Buttons for actions
      const buttons = [
        { id: `contact_about_${productId}`, title: '💬 Ask Question' },
        { id: 'get_recommendations', title: '💡 Similar Products' },
        { id: 'browse_catalog', title: '🔙 Back to Browse' }
      ];
      
      const response = {
        text: detailsText,
        type: product.images && product.images.length > 0 ? 'image_with_text' : 'interactive_buttons',
        buttons,
        context: { 
          currentFlow: 'product_details', 
          selectedProduct: productId,
          productName: product.name 
        }
      };
      
      // Add image if available
      if (product.images && product.images.length > 0) {
        response.imageUrl = product.images[0];
      }
      
      return response;
      
    } catch (error) {
      console.error('Error getting product details:', error);
      return {
        text: 'Sorry, I couldn\'t find details for that product. Please try another one.',
        type: 'text',
        context: { currentFlow: 'browse_catalog' }
      };
    }
  }

  // Recommendations flow handler
  async handleRecommendationsFlow(customer, nlpResult, context, message) {
    // Get AI-powered recommendations
    const recommendations = await catalogService.getRecommendations(
      customer.phoneNumber, 
      { type: 'general', limit: 5 }
    );
    
    if (recommendations.length === 0) {
      const popularProducts = await catalogService.getPopularProducts(5);
      
      if (popularProducts.length === 0) {
        return {
          text: 'Sorry, no products available right now. Please check back later!',
          type: 'text',
          context: { currentFlow: 'welcome' }
        };
      }
      
      const sections = [{
        title: 'Popular Products',
        rows: popularProducts.map(product => ({
          id: `product_${product.productId}`,
          title: product.name.substring(0, 24),
          description: `${product.price} - ${product.description.substring(0, 50)}...`
        }))
      }];
      
      return {
        text: 'Here are our most popular products:',
        type: 'interactive_list',
        buttonText: 'View Products',
        sections,
        context: { currentFlow: 'product_details' }
      };
    }
    
    // Personalized recommendations
    let recommendationText = '🎯 *Personalized Recommendations for You*\n\n';
    recommendationText += 'Based on your interests and browsing history, I think you\'ll love these products:\n\n';
    
    const sections = [{
      title: 'Recommended for You',
      rows: recommendations.map(product => ({
        id: `product_${product.productId}`,
        title: product.name.substring(0, 24),
        description: `${product.price} - Perfect match! ⭐${product.rating}/5`
      }))
    }];
    
    return {
      text: recommendationText,
      type: 'interactive_list',
      buttonText: 'View Recommendations',
      sections,
      context: { currentFlow: 'product_details' }
    };
  }

  // FAQ flow handler
  async handleFAQFlow(customer, nlpResult, context, message) {
    const faqs = require('../../data/faqs.json');
    const businessInfo = require('../../data/business-info.json');
    
    // Try to match user message with FAQ
    const matchedFAQ = this.findMatchingFAQ(message, faqs);
    
    if (matchedFAQ) {
      let response = `❓ *${matchedFAQ.question}*\n\n${matchedFAQ.answer}`;
      
      // Add helpful buttons
      const buttons = [
        { id: 'faq_more', title: '❓ More Questions' },
        { id: 'contact_support', title: '👨‍💼 Contact Support' },
        { id: 'browse_catalog', title: '🛍️ Browse Products' }
      ];
      
      return {
        text: response,
        type: 'interactive_buttons',
        buttons,
        context: { currentFlow: 'faq' }
      };
    }
    
    // Show FAQ categories
    const faqCategories = this.groupFAQsByCategory(faqs);
    const sections = Object.keys(faqCategories).map(category => ({
      title: category,
      rows: faqCategories[category].slice(0, 3).map((faq, index) => ({
        id: `faq_${category}_${index}`,
        title: faq.question.substring(0, 24),
        description: faq.answer.substring(0, 60) + '...'
      }))
    }));
    
    let faqText = '❓ *Frequently Asked Questions*\n\n';
    faqText += 'I can help answer common questions about our business:\n\n';
    faqText += `📍 Location: ${businessInfo.address}\n`;
    faqText += `🕐 Hours: ${businessInfo.hours}\n`;
    faqText += `📞 Phone: ${businessInfo.phone}\n\n`;
    faqText += 'Browse questions by category:';
    
    return {
      text: faqText,
      type: 'interactive_list',
      buttonText: 'Browse FAQs',
      sections,
      context: { currentFlow: 'faq' }
    };
  }

  // Support flow handler
  async handleSupportFlow(customer, nlpResult, context, message) {
    const businessInfo = require('../../data/business-info.json');
    
    let supportText = '👨‍💼 *Customer Support*\n\n';
    supportText += 'I\'d be happy to help, but if you need to speak with a human agent:\n\n';
    supportText += `📞 Call us: ${businessInfo.phone}\n`;
    supportText += `📧 Email: ${businessInfo.email}\n`;
    supportText += `🕐 Support Hours: ${businessInfo.supportHours}\n\n`;
    supportText += 'You can also describe your issue and I\'ll do my best to help!';
    
    const buttons = [
      { id: 'faq', title: '❓ Check FAQ First' },
      { id: 'describe_issue', title: '📝 Describe Issue' },
      { id: 'browse_catalog', title: '🔙 Back to Shopping' }
    ];
    
    return {
      text: supportText,
      type: 'interactive_buttons',
      buttons,
      context: { currentFlow: 'support' }
    };
  }

  // Fallback flow handler
  async handleFallbackFlow(customer, nlpResult, context, message) {
    const fallbackResponses = responses.fallback || [
      "I'm not sure I understand. Could you please rephrase that?",
      "I didn't quite get that. Can you try asking in a different way?",
      "Sorry, I'm not sure how to help with that. Try asking about our products or services."
    ];
    
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    
    const buttons = [
      { id: 'browse_catalog', title: '🛍️ Browse Products' },
      { id: 'get_recommendations', title: '💡 Recommendations' },
      { id: 'faq', title: '❓ Help & FAQ' },
      { id: 'contact_support', title: '👨‍💼 Contact Support' }
    ];
    
    return {
      text: randomResponse + '\n\nHere are some things I can help you with:',
      type: 'interactive_buttons',
      buttons,
      context: { currentFlow: 'welcome' }
    };
  }

  // Helper method to send response via WhatsApp
  async sendResponse(customerId, response) {
    try {
      switch (response.type) {
        case 'text':
          await whatsappService.sendTextMessage(customerId, response.text);
          break;
          
        case 'interactive_buttons':
          await whatsappService.sendInteractiveButtons(
            customerId, 
            response.text, 
            response.buttons,
            response.header
          );
          break;
          
        case 'interactive_list':
          await whatsappService.sendInteractiveList(
            customerId,
            response.text,
            response.buttonText,
            response.sections
          );
          break;
          
        case 'image_with_text':
          if (response.imageUrl) {
            await whatsappService.sendImage(customerId, response.imageUrl, response.text);
          }
          if (response.buttons) {
            await whatsappService.sendInteractiveButtons(
              customerId,
              'What would you like to do?',
              response.buttons
            );
          }
          break;
          
        default:
          await whatsappService.sendTextMessage(customerId, response.text);
      }
    } catch (error) {
      console.error('Error sending response:', error);
      // Fallback to simple text message
      await whatsappService.sendTextMessage(
        customerId, 
        "I'm having trouble sending a formatted response. " + response.text
      );
    }
  }

  // Helper methods
  async getOrCreateCustomer(phoneNumber) {
    let customer = await Customer.findOne({ phoneNumber });
    
    if (!customer) {
      customer = new Customer({
        phoneNumber,
        createdAt: new Date(),
        lastActive: new Date()
      });
      await customer.save();
    } else {
      customer.lastActive = new Date();
      await customer.save();
    }
    
    return customer;
  }

  async getCurrentConversation(customerId) {
    const sessionId = `session_${customerId}_${new Date().toISOString().split('T')[0]}`;
    
    let conversation = await Conversation.findOne({ 
      customerId, 
      sessionId,
      endTime: { $exists: false }
    });
    
    if (!conversation) {
      conversation = new Conversation({
        customerId,
        sessionId,
        currentFlow: 'welcome',
        currentStep: 'start',
        context: {}
      });
      await conversation.save();
    }
    
    return conversation;
  }

  async logMessage(conversationId, direction, content, messageType, nlpResult = null) {
    const messageData = {
      timestamp: new Date(),
      direction,
      content,
      messageType
    };
    
    if (nlpResult) {
      messageData.intent = nlpResult.intent;
      messageData.confidence = nlpResult.confidence;
      messageData.entities = nlpResult.entities;
    }
    
    await Conversation.findByIdAndUpdate(conversationId, {
      $push: { messages: messageData },
      $inc: { messageCount: 1 }
    });
  }

  async updateConversationContext(conversationId, newContext) {
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: { 
        context: newContext,
        lastActivity: new Date()
      }
    });
  }

  findMatchingFAQ(message, faqs) {
    const messageLower = message.toLowerCase();
    
    return faqs.find(faq => {
      const keywords = faq.keywords || [];
      return keywords.some(keyword => messageLower.includes(keyword.toLowerCase())) ||
             messageLower.includes(faq.question.toLowerCase().substring(0, 10));
    });
  }

  groupFAQsByCategory(faqs) {
    return faqs.reduce((groups, faq) => {
      const category = faq.category || 'General';
      if (!groups[category]) groups[category] = [];
      groups[category].push(faq);
      return groups;
    }, {});
  }
}

module.exports = new ConversationService();