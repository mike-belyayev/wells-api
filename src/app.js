require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
    }
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

// Export for Vercel
module.exports = app;