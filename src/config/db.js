const mongoose = require('mongoose');
require('dotenv').config();

let cachedDb = null;
let keepAliveTimer = null;
let isShuttingDown = false;

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
    
    // Setup keep-alive only if not in production
    if (process.env.NODE_ENV !== 'production') {
      setupKeepAlive();
    }

    cachedDb = connection;
    return connection;
  } catch (err) {
    console.error('Database connection error:', err.message);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
    throw err;
  }
}

function setupKeepAlive() {
  keepAliveTimer = setInterval(() => {
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.db.admin().ping((err) => {
        if (err) console.error('Keep-alive ping failed:', err);
      });
    }
  }, 60000);
}

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
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

// Graceful shutdown handler
function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  return mongoose.connection.close()
    .then(() => {
      console.log('Mongoose connection closed gracefully');
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
    })
    .catch(err => {
      console.error('Error closing Mongoose connection:', err);
    });
}

// Register shutdown handlers only in non-Vercel environment
if (!process.env.VERCEL) {
  process.once('SIGINT', gracefulShutdown);
  process.once('SIGTERM', gracefulShutdown);
}

module.exports = connectDB;