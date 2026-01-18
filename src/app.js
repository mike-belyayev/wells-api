require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Added CORS package
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

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // List of allowed origins
    const allowedOrigins = [
      'https://wells-logistics.vercel.app',
      'https://wells-logistics-dev.vercel.app',
      'http://localhost:5174',
      'http://localhost:5173',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow all origins in development for easier testing
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'Content-Disposition',
    'Authorization'
  ],
  maxAge: 86400, // 24 hours for preflight cache
  optionsSuccessStatus: 204
};

// Use CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware for debugging CORS
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// API Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/passengers', require('./routes/passengerRoutes'));
app.use('/api/trips', require('./routes/tripRoutes'));
app.use('/api/sites', require('./routes/siteRoutes'));

// Health Check Endpoint with CORS info
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection?.readyState;
  res.json({ 
    status: 'OK',
    dbState: dbStatus,
    dbStatusText: getDbStatusText(dbStatus),
    timestamp: new Date().toISOString(),
    cors: {
      origin: req.headers.origin,
      allowed: true,
      environment: process.env.NODE_ENV || 'development'
    },
    endpoints: {
      users: '/api/users',
      passengers: '/api/passengers',
      trips: '/api/trips',
      sites: '/api/sites'
    }
  });
});

// Test endpoint for CORS
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.headers.origin,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Auth test endpoint
app.get('/api/auth-test', require('./middleware/auth'), (req, res) => {
  res.json({
    message: 'Authentication successful',
    user: req.user,
    timestamp: new Date().toISOString()
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
      cors: {
        allowedOrigins: corsOptions.origin.toString(),
        credentials: corsOptions.credentials
      },
      endpoints: {
        health: '/api/health',
        corsTest: '/api/cors-test',
        authTest: '/api/auth-test',
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
  
  // Handle CORS errors specifically
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS Error',
      message: err.message,
      origin: req.headers.origin,
      allowedOrigins: corsOptions.origin.toString()
    });
  }
  
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
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('CORS Configuration:');
    console.log('- Allowed Origins:', [
      'https://wells-logistics.vercel.app',
      'https://wells-logistics-dev.vercel.app',
      'http://localhost:5174',
      process.env.FRONTEND_URL,
      ...(process.env.NODE_ENV === 'development' ? ['All origins in dev mode'] : [])
    ].filter(Boolean).join(', '));
    console.log('- Credentials:', corsOptions.credentials);
    console.log('Available routes:');
    console.log('- /api/health - Health check');
    console.log('- /api/cors-test - CORS test');
    console.log('- /api/auth-test - Authentication test (protected)');
    console.log('- /api/users');
    console.log('- /api/passengers');
    console.log('- /api/trips');
    console.log('- /api/sites');
  });
}