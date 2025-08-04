// ================================
// src/services/nlpService.js - Natural Language Processing
// ================================
// AI-powered intent recognition and entity extraction
const natural = require('natural');
const { GoogleAuth } = require('google-auth-library');

class NLPService {
  constructor() {
    // Initialize stemmer and analyzer
    this.stemmer = natural.PorterStemmer;
    this.analyzer = new natural.SentimentAnalyzer('English', this.stemmer, 'afinn');
    this.tokenizer = new natural.WordTokenizer();
    
    // Load intents and training data
    this.intents = require('../../data/intents.json');
    this.classifier = new natural.LogisticRegressionClassifier();
    this.trainClassifier();
  }

  // Train the classifier with intent data
  trainClassifier() {
    console.log('🧠 Training NLP classifier...');
    
    this.intents.forEach(intent => {
      intent.examples.forEach(example => {
        this.classifier.addDocument(example, intent.name);
      });
    });
    
    this.classifier.train();
    console.log('✅ NLP classifier trained successfully');
  }

  // Detect user intent from message
  async detectIntent(message, customerId) {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Use trained classifier
    const intent = this.classifier.classify(normalizedMessage);
    const classifications = this.classifier.getClassifications(normalizedMessage);
    const confidence = classifications.find(c => c.label === intent)?.value || 0;

    // Extract entities
    const entities = this.extractEntities(normalizedMessage);
    
    // Analyze sentiment
    const sentiment = this.analyzeSentiment(normalizedMessage);

    return {
      intent,
      confidence,
      entities,
      sentiment,
      originalMessage: message
    };
  }

  // Extract entities from message
  extractEntities(message) {
    const entities = {
      products: [],
      categories: [],
      price: null,
      quantity: null,
      phoneNumbers: [],
      emails: []
    };

    // Product name extraction (simple keyword matching)
    const productKeywords = ['phone', 'laptop', 'tablet', 'headphones', 'watch', 'camera'];
    productKeywords.forEach(keyword => {
      if (message.includes(keyword)) {
        entities.products.push(keyword);
      }
    });

    // Category extraction
    const categoryKeywords = ['electronics', 'clothing', 'books', 'home', 'sports'];
    categoryKeywords.forEach(category => {
      if (message.includes(category)) {
        entities.categories.push(category);
      }
    });

    // Price extraction
    const priceMatch = message.match(/\$?(\d+(?:\.\d{2})?)/);
    if (priceMatch) {
      entities.price = parseFloat(priceMatch[1]);
    }

    // Quantity extraction
    const quantityMatch = message.match(/(\d+)\s*(?:pieces?|items?|qty)/i);
    if (quantityMatch) {
      entities.quantity = parseInt(quantityMatch[1]);
    }

    // Phone number extraction
    const phoneMatch = message.match(/(\+?\d{1,4}[-.\s]?)?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g);
    if (phoneMatch) {
      entities.phoneNumbers = phoneMatch;
    }

    // Email extraction
    const emailMatch = message.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    if (emailMatch) {
      entities.emails = emailMatch;
    }

    return entities;
  }

  // Analyze sentiment of message
  analyzeSentiment(message) {
    const tokens = this.tokenizer.tokenize(message);
    const stemmedTokens = tokens.map(token => this.stemmer.stem(token));
    const score = this.analyzer.getSentiment(stemmedTokens);
    
    let sentiment = 'neutral';
    if (score > 0.1) sentiment = 'positive';
    else if (score < -0.1) sentiment = 'negative';
    
    return { score, sentiment };
  }

  // Get response template for intent
  getResponseTemplate(intent) {
    const intentData = this.intents.find(i => i.name === intent);
    if (!intentData || !intentData.responses) {
      return this.intents.find(i => i.name === 'fallback')?.responses || ['I didn\'t understand that.'];
    }
    
    // Return random response from available options
    const responses = intentData.responses;
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

module.exports = new NLPService();