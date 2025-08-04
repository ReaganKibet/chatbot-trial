// ================================
// src/services/catalogService.js - Product Catalog Management
// ================================
// AI-powered product search and recommendations
const Product = require('../models/Product');
const Customer = require('../models/Customer');

class CatalogService {
  constructor() {
    this.popularityWeight = 0.3;
    this.ratingWeight = 0.4;
    this.personalWeight = 0.3;
  }

  // Search products with AI-enhanced results
  async searchProducts(query, customerId = null, options = {}) {
    const {
      category = null,
      minPrice = 0,
      maxPrice = Infinity,
      limit = 10,
      sortBy = 'relevance'
    } = options;

    // Build search pipeline
    const searchPipeline = [];

    // Text search stage
    if (query) {
      searchPipeline.push({
        $match: {
          $text: { $search: query },
          isActive: true,
          price: { $gte: minPrice, $lte: maxPrice }
        }
      });
      
      // Add text score for relevance
      searchPipeline.push({
        $addFields: {
          textScore: { $meta: 'textScore' }
        }
      });
    } else {
      // No query, just filter
      searchPipeline.push({
        $match: {
          isActive: true,
          price: { $gte: minPrice, $lte: maxPrice },
          ...(category && { category })
        }
      });
    }

    // Get customer preferences for personalization
    let customerPrefs = null;
    if (customerId) {
      const customer = await Customer.findOne({ phoneNumber: customerId });
      customerPrefs = customer?.preferences;
    }

    // Add personalization score
    if (customerPrefs) {
      searchPipeline.push({
        $addFields: {
          personalScore: {
            $switch: {
              branches: [
                {
                  case: { $in: ['$category', customerPrefs.categories || []] },
                  then: 2
                },
                {
                  case: { $in: ['$brand', customerPrefs.brands || []] },
                  then: 1.5
                }
              ],
              default: 1
            }
          }
        }
      });
    }

    // Calculate final score
    searchPipeline.push({
      $addFields: {
        finalScore: {
          $add: [
            { $multiply: [{ $ifNull: ['$textScore', 1] }, this.personalWeight] },
            { $multiply: [{ $divide: ['$popularity', 100] }, this.popularityWeight] },
            { $multiply: ['$rating', this.ratingWeight] },
            { $ifNull: ['$personalScore', 0] }
          ]
        }
      }
    });

    // Sort by final score or specified field
    const sortStage = sortBy === 'relevance' 
      ? { $sort: { finalScore: -1 } }
      : { $sort: { [sortBy]: -1 } };
    
    searchPipeline.push(sortStage);
    searchPipeline.push({ $limit: limit });

    const products = await Product.aggregate(searchPipeline);
    
    // Log search for analytics
    if (customerId && query) {
      await this.logSearch(customerId, query, products.length);
    }

    return products;
  }

  // Get product details by ID
  async getProductDetails(productId) {
    const product = await Product.findOne({ productId, isActive: true });
    
    if (!product) {
      throw new Error('Product not found');
    }

    // Get related products
    const relatedProducts = await this.getRelatedProducts(productId, 5);
    
    return {
      ...product.toObject(),
      relatedProducts
    };
  }

  // AI-powered product recommendations
  async getRecommendations(customerId, options = {}) {
    const { 
      type = 'general', // 'general', 'similar', 'complementary'
      limit = 5,
      excludeViewed = true 
    } = options;

    const customer = await Customer.findOne({ phoneNumber: customerId });
    
    if (!customer) {
      // Return popular products for new customers
      return await this.getPopularProducts(limit);
    }

    const pipeline = [];

    // Start with active products
    pipeline.push({ $match: { isActive: true } });

    // Exclude previously viewed products if requested
    if (excludeViewed && customer.profile?.browsingHistory?.length > 0) {
      const viewedProductIds = customer.profile.browsingHistory.map(h => h.productId);
      pipeline.push({ 
        $match: { productId: { $nin: viewedProductIds } } 
      });
    }

    // Calculate recommendation score based on customer profile
    const preferredCategories = customer.preferences?.categories || [];
    const preferredBrands = customer.preferences?.brands || [];
    const purchaseHistory = customer.profile?.purchaseHistory || [];

    pipeline.push({
      $addFields: {
        recommendationScore: {
          $add: [
            // Category preference score
            {
              $cond: {
                if: { $in: ['$category', preferredCategories] },
                then: 3,
                else: 0
              }
            },
            // Brand preference score
            {
              $cond: {
                if: { $in: ['$brand', preferredBrands] },
                then: 2,
                else: 0
              }
            },
            // Price range preference score
            {
              $cond: {
                if: {
                  $and: [
                    { $gte: ['$price', customer.preferences?.priceRange?.min || 0] },
                    { $lte: ['$price', customer.preferences?.priceRange?.max || 10000] }
                  ]
                },
                then: 2,
                else: 0
              }
            },
            // Popularity score
            { $divide: ['$popularity', 100] },
            // Rating score
            '$rating'
          ]
        }
      }
    });

    // Sort by recommendation score
    pipeline.push({ $sort: { recommendationScore: -1 } });
    pipeline.push({ $limit: limit });

    const recommendations = await Product.aggregate(pipeline);

    // Log recommendation for analytics
    await this.logRecommendation(customerId, type, recommendations.map(r => r.productId));

    return recommendations;
  }

  // Get products by category with AI ranking
  async getProductsByCategory(category, customerId = null, limit = 10) {
    const pipeline = [
      { $match: { category, isActive: true } }
    ];

    // Add personalization if customer provided
    if (customerId) {
      const customer = await Customer.findOne({ phoneNumber: customerId });
      const preferredBrands = customer?.preferences?.brands || [];
      
      pipeline.push({
        $addFields: {
          personalScore: {
            $cond: {
              if: { $in: ['$brand', preferredBrands] },
              then: 2,
              else: 1
            }
          }
        }
      });
      
      pipeline.push({
        $addFields: {
          finalScore: {
            $add: [
              { $multiply: ['$personalScore', 0.4] },
              { $multiply: [{ $divide: ['$popularity', 100] }, 0.3] },
              { $multiply: ['$rating', 0.3] }
            ]
          }
        }
      });
      
      pipeline.push({ $sort: { finalScore: -1 } });
    } else {
      pipeline.push({ $sort: { popularity: -1, rating: -1 } });
    }

    pipeline.push({ $limit: limit });

    return await Product.aggregate(pipeline);
  }

  // Get popular products
  async getPopularProducts(limit = 10) {
    return await Product.find({ isActive: true })
      .sort({ popularity: -1, rating: -1 })
      .limit(limit);
  }

  // Get related products using collaborative filtering
  async getRelatedProducts(productId, limit = 5) {
    const product = await Product.findOne({ productId });
    
    if (!product) return [];

    // Find products in same category with similar characteristics
    const relatedProducts = await Product.find({
      productId: { $ne: productId },
      category: product.category,
      isActive: true,
      price: {
        $gte: product.price * 0.5,
        $lte: product.price * 2
      }
    })
    .sort({ popularity: -1, rating: -1 })
    .limit(limit);

    return relatedProducts;
  }

  // Log search for analytics and learning
  async logSearch(customerId, query, resultCount) {
    try {
      await Customer.findOneAndUpdate(
        { phoneNumber: customerId },
        {
          $push: {
            'profile.searchHistory': {
              query,
              resultCount,
              timestamp: new Date()
            }
          }
        }
      );
    } catch (error) {
      console.error('Error logging search:', error);
    }
  }

  // Log product view for recommendations
  async logProductView(customerId, productId) {
    try {
      const product = await Product.findOne({ productId });
      if (!product) return;

      // Update customer browsing history
      await Customer.findOneAndUpdate(
        { phoneNumber: customerId },
        {
          $push: {
            'profile.browsingHistory': {
              productId,
              category: product.category,
              viewedAt: new Date()
            }
          },
          $inc: { 'profile.totalViews': 1 }
        }
      );

      // Update product popularity
      await Product.findOneAndUpdate(
        { productId },
        { $inc: { popularity: 1 } }
      );
    } catch (error) {
      console.error('Error logging product view:', error);
    }
  }

  // Log recommendation for analytics
  async logRecommendation(customerId, type, productIds) {
    try {
      await Customer.findOneAndUpdate(
        { phoneNumber: customerId },
        {
          $push: {
            'profile.recommendationHistory': {
              type,
              productIds,
              timestamp: new Date()
            }
          }
        }
      );
    } catch (error) {
      console.error('Error logging recommendation:', error);
    }
  }

  // Update customer preferences based on interactions
  async updateCustomerPreferences(customerId, interactions) {
    try {
      const customer = await Customer.findOne({ phoneNumber: customerId });
      if (!customer) return;

      // Analyze interactions to update preferences
      const categoryFrequency = {};
      const brandFrequency = {};

      interactions.forEach(interaction => {
        if (interaction.category) {
          categoryFrequency[interaction.category] = (categoryFrequency[interaction.category] || 0) + 1;
        }
        if (interaction.brand) {
          brandFrequency[interaction.brand] = (brandFrequency[interaction.brand] || 0) + 1;
        }
      });

      // Get top categories and brands
      const topCategories = Object.entries(categoryFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category);

      const topBrands = Object.entries(brandFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([brand]) => brand);

      // Update customer preferences
      await Customer.findOneAndUpdate(
        { phoneNumber: customerId },
        {
          $set: {
            'preferences.categories': topCategories,
            'preferences.brands': topBrands
          }
        }
      );
    } catch (error) {
      console.error('Error updating customer preferences:', error);
    }
  }
}

module.exports = new CatalogService();