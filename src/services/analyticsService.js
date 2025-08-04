// ================================
// src/services/analyticsService.js - Analytics and Reporting
// ================================
// Tracks user interactions and generates insights
const Customer = require('../models/Customer');
const Conversation = require('../models/Conversation');
const Product = require('../models/Product');

class AnalyticsService {
  constructor() {
    this.events = []; // In-memory event storage for real-time analytics
  }

  // Track custom events
  async trackEvent(eventType, data) {
    try {
      const event = {
        type: eventType,
        timestamp: new Date(),
        ...data
      };

      // Store in memory for real-time analytics
      this.events.push(event);

      // Keep only last 1000 events in memory
      if (this.events.length > 1000) {
        this.events = this.events.slice(-1000);
      }

      // Log significant events
      console.log(`📊 Analytics Event: ${eventType}`, data);

      // Process specific event types
      switch (eventType) {
        case 'message_received':
          await this.updateCustomerActivity(data.customerId);
          break;
        case 'product_viewed':
          await this.updateProductPopularity(data.productId);
          break;
        case 'search_performed':
          await this.logSearchTerm(data.query, data.resultCount);
          break;
      }

    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }

  // Get real-time dashboard statistics
  async getDashboardStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalCustomers,
        activeToday,
        totalConversations,
        conversationsToday,
        totalMessages,
        messagesToday,
        averageResponseTime,
        topProducts,
        topSearches
      ] = await Promise.all([
        Customer.countDocuments(),
        Customer.countDocuments({ lastActive: { $gte: today } }),
        Conversation.countDocuments(),
        Conversation.countDocuments({ createdAt: { $gte: today } }),
        Conversation.aggregate([
          { $group: { _id: null, total: { $sum: '$messageCount' } } }
        ]),
        Conversation.aggregate([
          { $match: { createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$messageCount' } } }
        ]),
        this.calculateAverageResponseTime(),
        this.getTopProducts(5),
        this.getTopSearches(5)
      ]);

      return {
        customers: {
          total: totalCustomers,
          activeToday: activeToday,
          newToday: await Customer.countDocuments({ createdAt: { $gte: today } })
        },
        conversations: {
          total: totalConversations,
          today: conversationsToday
        },
        messages: {
          total: totalMessages[0]?.total || 0,
          today: messagesToday[0]?.total || 0
        },
        performance: {
          averageResponseTime,
          satisfactionRate: await this.calculateSatisfactionRate()
        },
        insights: {
          topProducts,
          topSearches,
          peakHours: await this.getPeakHours()
        }
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      return null;
    }
  }

  // Get conversation trends for charts
  async getConversationTrends(days = 7) {
    try {
      const trends = await Conversation.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            conversations: { $sum: 1 },
            messages: { $sum: '$messageCount' },
            completed: {
              $sum: { $cond: [{ $eq: ['$outcome.type', 'completed'] }, 1, 0] }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return trends.map(trend => ({
        date: trend._id,
        conversations: trend.conversations,
        messages: trend.messages,
        completionRate: trend.conversations > 0 ? 
          (trend.completed / trend.conversations * 100).toFixed(1) : 0
      }));
    } catch (error) {
      console.error('Error getting conversation trends:', error);
      return [];
    }
  }

  // Update customer last activity
  async updateCustomerActivity(customerId) {
    try {
      await Customer.findOneAndUpdate(
        { phoneNumber: customerId },
        { 
          lastActive: new Date(),
          $inc: { 'profile.totalInteractions': 1 }
        }
      );
    } catch (error) {
      console.error('Error updating customer activity:', error);
    }
  }

  // Update product popularity
  async updateProductPopularity(productId) {
    try {
      await Product.findOneAndUpdate(
        { productId },
        { $inc: { popularity: 1 } }
      );
    } catch (error) {
      console.error('Error updating product popularity:', error);
    }
  }

  // Log search terms for analytics
  async logSearchTerm(query, resultCount) {
    try {
      // This could be stored in a separate SearchLog collection
      // For now, we'll just track in events
      await this.trackEvent('search_logged', {
        query: query.toLowerCase(),
        resultCount,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error logging search term:', error);
    }
  }

  // Calculate average response time
  async calculateAverageResponseTime() {
    try {
      const conversations = await Conversation.find({
        duration: { $exists: true, $gt: 0 }
      }).limit(100).sort({ createdAt: -1 });

      if (conversations.length === 0) return 0;

      const avgDuration = conversations.reduce((sum, conv) => sum + conv.duration, 0) / conversations.length;
      return Math.round(avgDuration); // in seconds
    } catch (error) {
      console.error('Error calculating response time:', error);
      return 0;
    }
  }

  // Calculate satisfaction rate
  async calculateSatisfactionRate() {
    try {
      const conversations = await Conversation.find({
        satisfactionRating: { $exists: true }
      });

      if (conversations.length === 0) return 0;

      const avgRating = conversations.reduce((sum, conv) => sum + conv.satisfactionRating, 0) / conversations.length;
      return Math.round((avgRating / 5) * 100); // Convert to percentage
    } catch (error) {
      console.error('Error calculating satisfaction rate:', error);
      return 0;
    }
  }

  // Get top products by popularity
  async getTopProducts(limit = 5) {
    try {
      return await Product.find({ isActive: true })
        .sort({ popularity: -1, rating: -1 })
        .limit(limit)
        .select('name popularity rating price category');
    } catch (error) {
      console.error('Error getting top products:', error);
      return [];
    }
  }

  // Get top search terms
  getTopSearches(limit = 5) {
    try {
      const searchEvents = this.events.filter(e => e.type === 'search_logged');
      const searchCounts = {};

      searchEvents.forEach(event => {
        const query = event.query;
        searchCounts[query] = (searchCounts[query] || 0) + 1;
      });

      return Object.entries(searchCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([query, count]) => ({ query, count }));
    } catch (error) {
      console.error('Error getting top searches:', error);
      return [];
    }
  }

  // Get peak conversation hours
  async getPeakHours() {
    try {
      const hourCounts = await Conversation.aggregate([
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ]);

      return hourCounts.map(h => ({
        hour: h._id,
        count: h.count,
        label: `${h._id}:00 - ${h._id + 1}:00`
      }));
    } catch (error) {
      console.error('Error getting peak hours:', error);
      return [];
    }
  }

  // Generate daily report
  async generateDailyReport() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats = await this.getDashboardStats();
      const trends = await this.getConversationTrends(1);

      const report = {
        date: today.toISOString().split('T')[0],
        summary: {
          newCustomers: stats.customers.newToday,
          activeCustomers: stats.customers.activeToday,
          conversations: stats.conversations.today,
          messages: stats.messages.today
        },
        performance: {
          averageResponseTime: stats.performance.averageResponseTime,
          satisfactionRate: stats.performance.satisfactionRate,
          completionRate: trends[0]?.completionRate || 0
        },
        insights: stats.insights
      };

      console.log('📊 Daily Report Generated:', report);
      return report;
    } catch (error) {
      console.error('Error generating daily report:', error);
      return null;
    }
  }
}

module.exports = new AnalyticsService();