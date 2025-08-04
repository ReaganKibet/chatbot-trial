// ================================
// src/services/queueService.js - Message Queue Management
// ================================
// Handles asynchronous message processing with Bull Queue
const Queue = require('bull');
const redis = require('redis');

class QueueService {
  constructor() {
    // Redis connection for Bull
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD
    };

    // Create queues
    this.messageQueue = new Queue('message processing', {
      redis: this.redisConfig,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50 // Keep last 50 failed jobs
      }
    });

    this.analyticsQueue = new Queue('analytics processing', {
      redis: this.redisConfig
    });

    // Setup queue processors
    this.setupProcessors();
    this.setupEventHandlers();
  }

  // Setup queue processors
  setupProcessors() {
    // Message processing
    this.messageQueue.process('process_message', 10, async (job) => {
      const messageController = require('../controllers/messageController');
      return await messageController.processQueuedMessage(job.data);
    });

    // Analytics processing
    this.analyticsQueue.process('update_analytics', 5, async (job) => {
      const analyticsService = require('./analyticsService');
      return await analyticsService.trackEvent(job.data.eventType, job.data.data);
    });

    // Daily report generation
    this.analyticsQueue.process('generate_daily_report', async (job) => {
      const analyticsService = require('./analyticsService');
      return await analyticsService.generateDailyReport();
    });
  }

  // Setup event handlers for monitoring
  setupEventHandlers() {
    this.messageQueue.on('completed', (job, result) => {
      console.log(`✅ Message job ${job.id} completed`);
    });

    this.messageQueue.on('failed', (job, err) => {
      console.error(`❌ Message job ${job.id} failed:`, err.message);
    });

    this.messageQueue.on('stalled', (job) => {
      console.warn(`⚠️ Message job ${job.id} stalled`);
    });

    // Analytics queue events
    this.analyticsQueue.on('completed', (job) => {
      console.log(`📊 Analytics job ${job.id} completed`);
    });
  }

  // Add message to processing queue
  async addToQueue(jobType, data, options = {}) {
    try {
      const defaultOptions = {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      };

      const job = await this.messageQueue.add(jobType, data, {
        ...defaultOptions,
        ...options
      });

      console.log(`📨 Job ${job.id} added to queue: ${jobType}`);
      return job;
    } catch (error) {
      console.error('Error adding job to queue:', error);
      throw error;
    }
  }

  // Add analytics job
  async addAnalyticsJob(eventType, data, options = {}) {
    try {
      const job = await this.analyticsQueue.add('update_analytics', {
        eventType,
        data
      }, options);

      return job;
    } catch (error) {
      console.error('Error adding analytics job:', error);
      throw error;
    }
  }

  // Schedule daily report
  async scheduleDailyReport() {
    try {
      // Schedule for every day at 23:59
      const job = await this.analyticsQueue.add('generate_daily_report', {}, {
        repeat: { cron: '59 23 * * *' },
        removeOnComplete: 7, // Keep last 7 reports
        removeOnFail: 3
      });

      console.log('📅 Daily report scheduled');
      return job;
    } catch (error) {
      console.error('Error scheduling daily report:', error);
      throw error;
    }
  }

  // Get queue statistics
  async getQueueStats() {
    try {
      const [messageStats, analyticsStats] = await Promise.all([
        this.getQueueStatistics(this.messageQueue),
        this.getQueueStatistics(this.analyticsQueue)
      ]);

      return {
        messages: messageStats,
        analytics: analyticsStats
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return null;
    }
  }

  // Get statistics for a specific queue
  async getQueueStatistics(queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed()
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length
    };
  }

  // Cleanup old jobs
  async cleanupJobs() {
    try {
      await this.messageQueue.clean(24 * 60 * 60 * 1000, 'completed'); // 24 hours
      await this.messageQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7 days
      
      await this.analyticsQueue.clean(24 * 60 * 60 * 1000, 'completed');
      await this.analyticsQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed');
      
      console.log('🧹 Queue cleanup completed');
    } catch (error) {
      console.error('Error cleaning up jobs:', error);
    }
  }
}

module.exports = new QueueService();
