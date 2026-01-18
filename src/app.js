// src/app.js - RESTORE ORIGINAL WITH CORS FIX
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Add this line
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

// ========== SIMPLE CORS FIX ==========
// Keep your original middleware, but add this line FIRST:
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Keep your original enhanced CORS middleware below it (it won't break anything)
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://wells-logistics.vercel.app',
    'https://wells-logistics-dev.vercel.app',
    'http://localhost:5174',
    process.env.FRONTEND_URL,
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:*'] : [])
  ].filter(Boolean);

  const origin = req.headers.origin;
  if (allowedOrigins.some(allowedOrigin => 
    origin?.match(new RegExp(allowedOrigin.replace('*', '.*')))
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Vary', 'Origin');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
// ========== END CORS FIX ==========

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/passengers', require('./routes/passengerRoutes'));
app.use('/api/trips', require('./routes/tripRoutes'));
app.use('/api/sites', require('./routes/siteRoutes'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection?.readyState;
  res.json({ 
    status: 'OK',
    dbState: dbStatus,
    dbStatusText: getDbStatusText(dbStatus),
    timestamp: new Date().toISOString(),
    cors: {
      origin: req.headers.origin,
      allowed: res.getHeader('Access-Control-Allow-Origin')
    },
    endpoints: {
      users: '/api/users',
      passengers: '/api/passengers',
      trips: '/api/trips',
      sites: '/api/sites'
    }
  });
});

// Root Endpoint
app.get(['/', '/api'], async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }
    
    res.json({ 
      message: 'API is working',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/api/health',
        users: '/api/users',
        passengers: '/api/passengers',
        trips: '/api/trips',
        sites: '/api/sites'
      }
    });
  } catch (err) {
    res.status(500).json({
      error: 'Database connection error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
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

// Error Handlers
app.use((req, res, next) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    requestedPath: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('API Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Server Export
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🔓 CORS: Enabled for all origins');
    console.log('📡 Available routes:');
    console.log('   - /api/users');
    console.log('   - /api/passengers');
    console.log('   - /api/trips');
    console.log('   - /api/sites');
    console.log('   - /api/health (for testing)');
  });
}