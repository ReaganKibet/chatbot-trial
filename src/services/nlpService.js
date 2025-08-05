// ================================
// src/services/nlpService.js - Gemini AI + Natural.js NLP
// ================================
const natural = require('natural');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');  // Add this import
const fs = require('fs');      // Add this import

class NLPService {
  constructor() {
    // Initialize Gemini AI
    if (process.env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ 
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' 
      });
      this.geminiEnabled = true;
    } else {
      console.warn('⚠️ GEMINI_API_KEY not found, using fallback NLP');
      this.geminiEnabled = false;
    }

    // Initialize Natural.js for fallback
    this.stemmer = natural.PorterStemmer;
    this.analyzer = new natural.SentimentAnalyzer('English', this.stemmer, 'afinn');
    this.tokenizer = new natural.WordTokenizer();
    
    // Load intents and train classifier
    const intentsPath = path.join(__dirname, '../../data/intents.json');
    if (!fs.existsSync(intentsPath)) {
      throw new Error(`Intents file not found at ${intentsPath}`);
    }
    const intentsData = require(intentsPath);
    if (!Array.isArray(intentsData.intents)) {
      throw new Error('intents.json must contain an "intents" array');
    }
    this.intents = intentsData.intents;
    this.classifier = new natural.LogisticRegressionClassifier();
    this.trainClassifier();
  }

  // Train fallback classifier
  trainClassifier() {
    if (!Array.isArray(this.intents)) {
      console.error('❌ this.intents is not an array:', typeof this.intents);
      this.intents = [];
      return;
    }
    console.log(`🧠 Training with ${this.intents.length} intents...`);
    this.intents.forEach(intent => {
      if (!intent.name || !Array.isArray(intent.examples)) {
        console.warn('⚠️ Invalid intent structure:', intent);
        return;
      }
      intent.examples.forEach(example => {
        if (typeof example === 'string') {
          this.classifier.addDocument(example, intent.name);
        }
      });
    });
    this.classifier.train();
    console.log('✅ NLP classifier trained successfully');
  }

  // Main intent detection method
  async detectIntent(message, customerId) {
    if (this.geminiEnabled) {
      try {
        return await this.detectIntentWithGemini(message, customerId);
      } catch (error) {
        console.error('Gemini NLP Error, falling back:', error.message);
        return this.detectIntentWithNatural(message);
      }
    } else {
      return this.detectIntentWithNatural(message);
    }
  }

  // Gemini AI intent detection
  async detectIntentWithGemini(message, customerId) {
    const prompt = `
Analyze this customer message for a WhatsApp e-commerce chatbot:

Message: "${message}"

Extract and return ONLY a JSON object with these fields:
{
  "intent": "one of: greeting, product_search, browse_catalog, product_details, get_recommendations, faq, contact_support, fallback",
  "confidence": 0.85,
  "entities": {
    "products": ["iPhone", "laptop"],
    "categories": ["electronics"],
    "price": 500,
    "quantity": 2
  },
  "sentiment": {
    "score": 0.1,
    "sentiment": "positive"
  }
}

Rules:
- confidence should be 0.0 to 1.0
- sentiment: positive, negative, or neutral
- only include entities that are clearly mentioned
- be conservative with confidence scores`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean and parse JSON
    const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
    const analysis = JSON.parse(cleanedText);
    
    return {
      ...analysis,
      originalMessage: message,
      source: 'gemini'
    };
  }

  // Natural.js fallback intent detection
  detectIntentWithNatural(message) {
    const lowerMessage = message.toLowerCase();
    
    // Use trained classifier
    const intent = this.classifier.classify(lowerMessage);
    const classifications = this.classifier.getClassifications(lowerMessage);
    const confidence = classifications.find(c => c.label === intent)?.value || 0.5;

    // Extract entities with regex
    const entities = this.extractEntities(lowerMessage);
    
    // Analyze sentiment
    const sentiment = this.analyzeSentiment(lowerMessage);
    
    return {
      intent,
      confidence,
      entities,
      sentiment,
      originalMessage: message,
      source: 'natural'
    };
  }

  // Extract entities using regex patterns
  extractEntities(message) {
    const entities = {
      products: [],
      categories: [],
      price: null,
      quantity: null
    };

    // Product keywords
    const productKeywords = [
      'phone', 'smartphone', 'iphone', 'android',
      'laptop', 'computer', 'pc', 'macbook',
      'tablet', 'ipad', 'headphones', 'earbuds',
      'watch', 'smartwatch', 'camera', 'tv'
    ];
    
    productKeywords.forEach(keyword => {
      if (message.includes(keyword)) {
        entities.products.push(keyword);
      }
    });

    // Category keywords
    const categoryKeywords = [
      'electronics', 'clothing', 'fashion', 'books',
      'home', 'garden', 'sports', 'health', 'beauty'
    ];
    
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
    const quantityMatch = message.match(/(\d+)\s*(?:pieces?|items?|qty|quantity)/i);
    if (quantityMatch) {
      entities.quantity = parseInt(quantityMatch[1]);
    }

    return entities;
  }

  // Sentiment analysis
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
      return 'I\'m not sure how to help with that. Could you please rephrase?';
    }
    
    const responses = intentData.responses;
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

module.exports = new NLPService();