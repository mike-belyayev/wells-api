const mongoose = require('mongoose');
require('dotenv').config();

let cachedDb = null;
let keepAliveTimer = null;

async function connectDB() {
  // Return cached connection if available
  if (cachedDb) {
    console.log('Using existing database connection');
    return cachedDb;
  }

  try {
    const connectionOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 30000 // Added for better keepalive
    };

    // Debug mode in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
      console.log('Mongoose debug mode enabled');
    }

    const connection = await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
    console.log('MongoDB Connected successfully');

    // Serverless-specific optimizations
    if (process.env.VERCEL) {
      console.log('Running in Vercel environment - applying serverless optimizations');
      setupServerlessKeepAlive();
    } else {
      setupStandardKeepAlive();
    }

    cachedDb = connection;
    return connection;
  } catch (err) {
    console.error('Database connection error:', err.message);
    
    // Don't exit process in serverless environment
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw err; // Re-throw for serverless functions to handle
  }
}

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB cluster:', mongoose.connection.host);
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
  cachedDb = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from DB');
  cachedDb = null;
  if (keepAliveTimer) clearInterval(keepAliveTimer);
});

// Keep-alive for serverless environments
function setupServerlessKeepAlive() {
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  
  keepAliveTimer = setInterval(() => {
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.db.admin().ping((err) => {
        if (err) {
          console.error('Keep-alive ping failed:', err);
          // Attempt to reconnect
          mongoose.connection.close().then(() => connectDB());
        }
      });
    }
  }, 30000); // More frequent pings for serverless
}

// Standard keep-alive for non-serverless
function setupStandardKeepAlive() {
  if (keepAliveTimer) clearInterval(keepAliveTimer);
  
  keepAliveTimer = setInterval(() => {
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.db.admin().ping((err) => {
        if (err) console.error('Standard keep-alive ping failed:', err);
      });
    }
  }, 60000);
}

// Graceful shutdown
function gracefulShutdown() {
  return mongoose.connection.close()
    .then(() => {
      console.log('Mongoose connection closed gracefully');
      if (keepAliveTimer) clearInterval(keepAliveTimer);
    })
    .catch(err => {
      console.error('Error closing Mongoose connection:', err);
    });
}

// Handle different shutdown scenarios
if (!process.env.VERCEL) {
  process.on('SIGINT', gracefulShutdown);
  process.on('SIGTERM', gracefulShutdown);
  process.on('exit', gracefulShutdown);
}

module.exports = connectDB;