const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.log('⚠️ No MONGODB_URI found, skipping database connection');
      return;
    }

    console.log('🔗 Attempting to connect to MongoDB...');
    
    // Modern MongoDB connection options
    const options = {
      // Remove deprecated options that cause errors
      // Only use supported options for modern MongoDB drivers
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    // Continue without database for development
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ Development mode: Server will continue without database');
      return;
    }
    
    // Exit in production
    console.error('💥 Exiting process due to database connection failure');
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('🔗 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('📴 Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('📴 MongoDB connection closed through app termination');
  process.exit(0);
});

module.exports = connectDB;