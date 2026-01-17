require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
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

// Enhanced CORS Middleware - Environment-based rules
app.use((req, res, next) => {
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';
  const origin = req.headers.origin;
  
  console.log(`CORS: Environment=${environment}, Origin=${origin || 'none'}`);
  
  // Production: Strict CORS rules
  if (isProduction) {
    const productionOrigins = [
      'https://wells-logistics.vercel.app',
      // Add other production domains if needed
      process.env.PRODUCTION_FRONTEND_URL
    ].filter(Boolean);
    
    if (origin && productionOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      console.log(`Production CORS: Allowed ${origin}`);
    }
  } 
  // Non-production: Allow all origins
  else {
    // Allow any origin in development/preview
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      console.log(`Non-production CORS: Allowed ${origin}`);
    } else {
      // For requests without Origin header (e.g., curl, direct access)
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }

  // Common headers for all environments
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Vary', 'Origin'); // Important for caching

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('CORS: Handling OPTIONS preflight');
    return res.sendStatus(204);
  }
  
  next();
});

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
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    cors: {
      origin: req.headers.origin,
      allowed: res.getHeader('Access-Control-Allow-Origin'),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
    },
    endpoints: {
      users: '/api/users',
      passengers: '/api/passengers',
      trips: '/api/trips',
      sites: '/api/sites'
    }
  });
});

// Environment Info Endpoint (for debugging)
app.get('/api/env-info', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    origin: req.headers.origin,
    allowedOrigin: res.getHeader('Access-Control-Allow-Origin'),
    isProduction: (process.env.VERCEL_ENV || process.env.NODE_ENV) === 'production',
    timestamp: new Date().toISOString(),
    message: (process.env.VERCEL_ENV || process.env.NODE_ENV) === 'production' 
      ? 'Production mode - strict CORS' 
      : 'Non-production mode - relaxed CORS'
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
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
      corsMode: (process.env.VERCEL_ENV || process.env.NODE_ENV) === 'production' ? 'strict' : 'relaxed',
      endpoints: {
        health: '/api/health',
        envInfo: '/api/env-info',
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
    requestedPath: req.path,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
  });
});

app.use((err, req, res, next) => {
  console.error('API Error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development'
  });
});

// Server Export
if (process.env.VERCEL) {
  module.exports = app;
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Vercel Environment: ${process.env.VERCEL_ENV || 'not set'}`);
    console.log('CORS Mode:', (process.env.VERCEL_ENV || process.env.NODE_ENV) === 'production' ? 'Production (strict)' : 'Development/Preview (relaxed)');
    console.log('Available routes:');
    console.log('- /api/health');
    console.log('- /api/env-info');
    console.log('- /api/users');
    console.log('- /api/passengers');
    console.log('- /api/trips');
    console.log('- /api/sites');
  });
}