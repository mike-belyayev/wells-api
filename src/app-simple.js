// app-simple.js - SIMPLE WORKING VERSION WITHOUT COMPLEX CORS
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const dbConnect = require('./lib/mongodb');

const app = express();

// 1. SIMPLE CORS - Allow everything during debugging
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// 2. Basic middleware
app.use(express.json());

// 3. Test route - verify the server works
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 4. MANUALLY load routes one at a time
// Start with NO routes, then add them one by one

// Route 1: Try userRoutes
try {
  console.log('Attempting to load userRoutes...');
  const userRoutes = require('./routes/userRoutes');
  app.use('/api/users', userRoutes);
  console.log('✅ userRoutes loaded successfully');
} catch (error) {
  console.error('❌ userRoutes failed:', error.message);
  console.error('Stack:', error.stack);
}

// Route 2: Try tripRoutes  
try {
  console.log('\nAttempting to load tripRoutes...');
  const tripRoutes = require('./routes/tripRoutes');
  app.use('/api/trips', tripRoutes);
  console.log('✅ tripRoutes loaded successfully');
} catch (error) {
  console.error('❌ tripRoutes failed:', error.message);
}

// Route 3: Try siteRoutes
try {
  console.log('\nAttempting to load siteRoutes...');
  const siteRoutes = require('./routes/siteRoutes');
  app.use('/api/sites', siteRoutes);
  console.log('✅ siteRoutes loaded successfully');
} catch (error) {
  console.error('❌ siteRoutes failed:', error.message);
}

// Route 4: Try passengerRoutes LAST (most likely culprit)
try {
  console.log('\nAttempting to load passengerRoutes...');
  const passengerRoutes = require('./routes/passengerRoutes');
  app.use('/api/passengers', passengerRoutes);
  console.log('✅ passengerRoutes loaded successfully');
} catch (error) {
  console.error('❌ passengerRoutes failed:', error.message);
}

// 5. Health check
app.get('/api/health', async (req, res) => {
  try {
    await dbConnect();
    const dbStatus = mongoose.connection?.readyState || 0;
    
    res.json({
      status: 'OK',
      dbConnected: dbStatus === 1,
      dbStatus: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbStatus] || 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// 6. Simple root endpoint
app.get(['/', '/api'], (req, res) => {
  res.json({
    message: 'Wells Guyana API',
    version: '1.0.0',
    endpoints: {
      test: '/api/test',
      health: '/api/health',
      users: '/api/users',
      trips: '/api/trips',
      sites: '/api/sites',
      passengers: '/api/passengers'
    },
    cors: 'Enabled for all origins (*)'
  });
});

// 7. Simple error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 8. 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} not found`
  });
});

// 9. Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔓 CORS: Enabled for ALL origins (*)`);
  console.log('='.repeat(50));
  console.log('\nAvailable endpoints:');
  console.log(`  http://localhost:${PORT}/api/test`);
  console.log(`  http://localhost:${PORT}/api/health`);
  console.log(`  http://localhost:${PORT}/api/users`);
  console.log(`  http://localhost:${PORT}/api/trips`);
  console.log(`  http://localhost:${PORT}/api/sites`);
  console.log(`  http://localhost:${PORT}/api/passengers`);
  console.log('\n💡 Tip: Open http://localhost:3000/api/test in your browser');
});