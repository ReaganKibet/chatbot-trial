// ================================
// src/controllers/messageController.js - Message Processing Controller
// ================================
// Coordinates message processing and response generation
const conversationService = require('../services/conversationService');
const analyticsService = require('../services/analyticsService');
const queueService = require('../services/queueService');

class MessageController {
  // Process incoming message (called from webhook)
  async processIncomingMessage(customerId, message, messageType) {
    try {
      // Add to processing queue for async handling
      await queueService.addToQueue('process_message', {
        customerId,
        message,
        messageType,
        timestamp: new Date()
      });

      return { status: 'queued', message: 'Message queued for processing' };
    } catch (error) {
      console.error('Error queuing message:', error);
      throw error;
    }
  }

  // Process message from queue (async)
  async processQueuedMessage(jobData) {
    const { customerId, message, messageType, timestamp } = jobData;

    try {
      console.log(`🔄 Processing queued message from ${customerId}`);

      // Track message received
      await analyticsService.trackEvent('message_received', {
        customerId,
        messageType,
        timestamp
      });

      // Process through conversation service
      const response = await conversationService.processMessage(
        customerId, 
        message, 
        messageType
      );

      // Track response sent
      await analyticsService.trackEvent('message_sent', {
        customerId,
        responseType: response.type,
        intent: response.intent,
        timestamp: new Date()
      });

      console.log(`✅ Message processed successfully for ${customerId}`);
      return response;

    } catch (error) {
      console.error(`❌ Error processing message for ${customerId}:`, error);
      
      // Track error for analytics
      await analyticsService.trackEvent('message_error', {
        customerId,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  // Handle button interactions
  async handleButtonInteraction(customerId, buttonId, context) {
    try {
      // Parse button action
      const action = this.parseButtonAction(buttonId);
      
      // Route to appropriate handler
      switch (action.type) {
        case 'category':
          return await this.handleCategorySelection(customerId, action.value, context);
        case 'product':
          return await this.handleProductSelection(customerId, action.value, context);
        case 'flow':
          return await this.handleFlowNavigation(customerId, action.value, context);
        default:
          return await conversationService.processMessage(customerId, buttonId, 'button');
      }
    } catch (error) {
      console.error('Error handling button interaction:', error);
      throw error;
    }
  }

  // Parse button action from button ID
  parseButtonAction(buttonId) {
    const parts = buttonId.split('_');
    return {
      type: parts[0], // category, product, flow, etc.
      value: parts.slice(1).join('_')
    };
  }

  // Handle category selection
  async handleCategorySelection(customerId, categoryName, context) {
    const catalogService = require('../services/catalogService');
    
    // Get products in category
    const products = await catalogService.getProductsByCategory(
      categoryName, 
      customerId, 
      8
    );

    if (products.length === 0) {
      return {
        text: `Sorry, no products found in ${categoryName} category.`,
        type: 'text'
      };
    }

    // Create product list
    const sections = [{
      title: categoryName,
      rows: products.map(product => ({
        id: `product_${product.productId}`,
        title: product.name.substring(0, 24),
        description: `${product.price} - ${product.description.substring(0, 50)}...`
      }))
    }];

    return {
      text: `Here are our ${categoryName} products:`,
      type: 'interactive_list',
      buttonText: 'View Products',
      sections,
      context: { 
        currentFlow: 'product_details', 
        selectedCategory: categoryName 
      }
    };
  }

  // Handle product selection
  async handleProductSelection(customerId, productId, context) {
    return await conversationService.processMessage(
      customerId, 
      `product_${productId}`, 
      'product_selection'
    );
  }

  // Handle flow navigation
  async handleFlowNavigation(customerId, flowName, context) {
    const flowMessages = {
      'browse_catalog': 'I want to browse your catalog',
      'get_recommendations': 'Show me recommendations',
      'search_product': 'I want to search for products',
      'faq': 'I need help',
      'contact_support': 'I want to contact support'
    };

    const message = flowMessages[flowName] || flowName;
    return await conversationService.processMessage(customerId, message, 'navigation');
  }
}

module.exports = new MessageController();