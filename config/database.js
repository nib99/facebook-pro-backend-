const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MongoDB connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
    };

    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Connection event handlers
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Mongoose connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  Mongoose disconnected from MongoDB');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('✅ Mongoose connection closed through app termination');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error closing Mongoose connection:', err);
        process.exit(1);
      }
    });

    // Handle application termination
    process.on('SIGTERM', async () => {
      try {
        await mongoose.connection.close();
        console.log('✅ Mongoose connection closed through SIGTERM');
        process.exit(0);
      } catch (err) {
        console.error('❌ Error closing Mongoose connection:', err);
        process.exit(1);
      }
    });
	  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Stack:', error.stack);
    
    // Exit process with failure
    process.exit(1);
  }
};

// Export connection function
module.exports = connectDB;
