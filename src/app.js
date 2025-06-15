require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose'); // Added missing import
const connectDB = require('./config/db');

const app = express();

// Database Connection Logic
const initializeDB = () => {
  if (process.env.VERCEL) {
    // Serverless-friendly connection for Vercel
    connectDB().catch(err => {
      console.error('Vercel DB connection error:', err);
    });
  } else {
    // Regular connection for local/dev
    connectDB();
  }
};
initializeDB();

// Enhanced CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'development' 
    ? true  // Allow all origins in dev
    : [
        process.env.FRONTEND_URL,
        'https://*.vercel.app',
        new RegExp(`${process.env.VERCEL_URL?.replace('https://', '.*')}`)
      ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/users', require('./routes/userRoutes'));

app.get(['/', '/api'], async (req, res) => {
  try {
    // Lazy connect if disconnected
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    
    res.json({ 
      message: 'API is working',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/api/health'
      },
      dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      dbStatusText: getDbStatusText(mongoose.connection.readyState)
    });
  } catch (err) {
    res.status(500).json({
      error: 'Database connection error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection?.readyState;
  res.json({ 
    status: 'OK',
    dbState: dbStatus,
    dbStatusText: getDbStatusText(dbStatus),
    timestamp: new Date().toISOString()
  });
});

// Helper function for DB status
function getDbStatusText(status) {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
    99: 'Unknown'
  };
  return states[status] || states[99];
}

// Enhanced 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    requestedPath: req.path,
    availableEndpoints: {
      root: '/',
      apiRoot: '/api',
      healthCheck: '/api/health'
    }
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('API Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Export for both local and Vercel
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`DB Status: ${getDbStatusText(mongoose.connection?.readyState)}`);
  });
}