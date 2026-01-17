const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const dbConnect = require('../lib/mongodb');

// Helper function to add CORS headers to error responses
const addCorsHeaders = (res, origin) => {
  if (origin && (origin.endsWith('.vercel.app') || origin.includes('localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Vary', 'Origin');
};

const auth = async (req, res, next) => {
  const origin = req.headers.origin;
  
  try {
    // Ensure database connection
    await dbConnect();
    
    const authHeader = req.header('Authorization');
    
    // More robust header validation
    if (!authHeader) {
      addCorsHeaders(res, origin);
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No authorization header provided'
      });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      addCorsHeaders(res, origin);
      return res.status(401).json({ 
        error: 'Invalid token format',
        message: 'Authorization header must start with "Bearer "'
      });
    }
    
    const token = authHeader.replace('Bearer ', '').trim();
    
    if (!token) {
      addCorsHeaders(res, origin);
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Token is missing after Bearer prefix'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user with query timeout
    const user = await User.findById(decoded._id)
      .select('-password')
      .maxTimeMS(10000);
    
    if (!user) {
      addCorsHeaders(res, origin);
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'User not found'
      });
    }

    // Attach to request
    req.token = token;
    req.user = user;
    
    console.log(`Authenticated user: ${user.email || user._id}`);
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    
    addCorsHeaders(res, origin);
    
    // More specific error responses
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Malformed JWT token'
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please log in again'
      });
    }
    
    if (err.name === 'MongooseError' || err.name.includes('Mongo')) {
      return res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Database connection issue'
      });
    }

    // Generic authentication error
    res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Please authenticate'
    });
  }
};

module.exports = auth;