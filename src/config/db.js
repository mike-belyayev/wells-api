const mongoose = require('mongoose');
require('dotenv').config();

let cachedDb = null;

async function connectDB() {
  if (cachedDb) {
    console.log('Using existing database connection');
    return cachedDb;
  }

  try {
    const connectionOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    // Enable debug mode in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }

    const connection = await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
    console.log('MongoDB Connected...');
    cachedDb = connection;
    return connection;
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
}

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from DB');
  cachedDb = null;
});

// Keep connection alive in serverless environment
setInterval(() => {
  if (mongoose.connection.readyState === 1) {
    mongoose.connection.db.admin().ping((err) => {
      if (err) console.error('Keep-alive ping failed:', err);
    });
  }
}, 60000); // Ping every minute

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed due to app termination');
  process.exit(0);
});

module.exports = connectDB;