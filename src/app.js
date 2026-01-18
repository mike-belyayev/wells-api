// src/app.js - CLEAN WORKING VERSION
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const dbConnect = require('./lib/mongodb');

const app = express();

// ========== SIMPLE CORS ==========
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:5174',
    'https://wells-logistics.vercel.app',
    'https://wells-logistics-dev.vercel.app',
    // Match ALL Vercel preview deployments
    /\.vercel\.app$/
  ];
  
  const origin = req.headers.origin;
  
  // Check if origin matches any allowed pattern
  const isAllowed = allowedOrigins.some(pattern => {
    if (typeof pattern === 'string') {
      return origin === pattern;
    }
    if (pattern instanceof RegExp) {
      return pattern.test(origin);
    }
    return false;
  });
  
  if (isAllowed || !origin) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// ========== MIDDLEWARE ==========
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== DATABASE CONNECTION ==========
const initializeDB = () => {
  dbConnect().catch(err => {
    console.error('Database connection error:', err.message);
  });
};
initializeDB();

// ========== ROUTES ==========
// Load routes directly (your routes work fine!)
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/passengers', require('./routes/passengerRoutes'));
app.use('/api/trips', require('./routes/tripRoutes'));
app.use('/api/sites', require('./routes/siteRoutes'));

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection?.readyState;
  const statusText = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbStatus] || 'unknown';
  
  res.json({
    status: 'OK',
    db: {
      state: dbStatus,
      status: statusText,
      connected: dbStatus === 1
    },
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      origin: req.headers.origin,
      note: 'Configured for all Vercel deployments'
    }
  });
});

// ========== ROOT ENDPOINT ==========
app.get(['/', '/api'], (req, res) => {
  res.json({
    message: 'Wells Guyana API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    isVercel: !!process.env.VERCEL,
    endpoints: {
      health: '/api/health',
      users: '/api/users',
      passengers: '/api/passengers',
      trips: '/api/trips',
      sites: '/api/sites'
    },
    cors: {
      allowedOrigins: [
        'http://localhost:5174',
        'https://wells-logistics.vercel.app',
        'https://wells-logistics-dev.vercel.app',
        'All *.vercel.app domains'
      ]
    }
  });
});

// ========== ERROR HANDLERS ==========
// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err.stack);
  
  // CORS-specific errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS Error',
      message: `Origin ${req.headers.origin || 'unknown'} not allowed`,
      allowedOrigins: [
        'http://localhost:5174',
        'https://wells-logistics.vercel.app',
        'https://wells-logistics-dev.vercel.app',
        'All *.vercel.app domains'
      ]
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ========== SERVER START ==========
if (process.env.VERCEL) {
  // Export for Vercel serverless
  module.exports = app;
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('🔓 CORS: Enabled for:');
    console.log('   • http://localhost:5174');
    console.log('   • https://wells-logistics.vercel.app');
    console.log('   • https://wells-logistics-dev.vercel.app');
    console.log('   • All *.vercel.app domains (including previews)');
    console.log('='.repeat(50));
    console.log('\n📡 Available endpoints:');
    console.log('   http://localhost:3000/api/health');
    console.log('   http://localhost:3000/api/users');
    console.log('   http://localhost:3000/api/passengers');
    console.log('   http://localhost:3000/api/trips');
    console.log('   http://localhost:3000/api/sites');
  });
}