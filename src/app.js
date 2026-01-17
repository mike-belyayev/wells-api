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

// FIXED CORS Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow ALL origins (for debugging)
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`CORS DEBUG: Allowed ${origin}`);
    // Only set credentials header when we have a specific origin (not wildcard)
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Cannot use credentials with wildcard (*), so don't set this header
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Vary', 'Origin');
  
  if (req.method === 'OPTIONS') {
    console.log('CORS: OPTIONS preflight');
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

// Add CORS Test Endpoint (for debugging)
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS test endpoint',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin,
    allowedOrigin: res.getHeader('Access-Control-Allow-Origin'),
    hasCredentials: res.getHeader('Access-Control-Allow-Credentials') === 'true',
    note: 'If hasCredentials is false, your frontend cannot send cookies/auth headers'
  });
});

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
      allowed: res.getHeader('Access-Control-Allow-Origin'),
      credentials: res.getHeader('Access-Control-Allow-Credentials')
    },
    endpoints: {
      users: '/api/users',
      passengers: '/api/passengers',
      trips: '/api/trips',
      sites: '/api/sites',
      corsTest: '/api/cors-test'
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
      corsMode: 'All origins allowed (debug mode)',
      endpoints: {
        health: '/api/health',
        corsTest: '/api/cors-test',
        users: '/api/users',
        passengers: '/api/passengers',
        trips: '/api/trips',
        sites: '/api/sites'
      }
    });
  } catch (err) {
    // Ensure CORS headers on error responses
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    
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

// Error Handlers with CORS headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.status(404).json({ 
    error: 'Endpoint not found',
    requestedPath: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('API Error:', err.stack);
  
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
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
    console.log('CORS Policy: Allowing ALL origins (debug mode)');
    console.log('Note: Credentials only allowed with specific origins');
    console.log('Test endpoints:');
    console.log('- /api/cors-test (CORS debugging)');
    console.log('- /api/health (Health check)');
    console.log('- /api/users (User routes)');
    console.log('- /api/passengers (Passenger routes)');
    console.log('- /api/trips (Trip routes)');
    console.log('- /api/sites (Site routes)');
  });
}