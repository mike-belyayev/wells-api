require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');

const app = express();

// Connect to Database (optional for Vercel serverless)
if (process.env.NODE_ENV !== 'production') {
  connectDB();
}

// CORS Configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://*.vercel.app'
  ]
}));

// Middleware
app.use(express.json());

// API Routes
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API is working',
    endpoints: {
      health: '/api/health',
      // Add your other endpoints here
    },
    dbStatus: mongoose.connection?.readyState === 1 ? 'Connected' : 'Disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    dbState: mongoose.connection?.readyState || 0,
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Endpoint not found',
    try: '/api' 
  });
});

// Start server only if not in Vercel environment
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`DB Status: ${getDbStatusText(mongoose.connection?.readyState)}`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Export for Vercel
module.exports = app;

// Helper function
function getDbStatusText(status) {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  return states[status] || 'Unknown';
}