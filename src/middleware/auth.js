const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const dbConnect = require('../lib/mongodb');

// SUPER PERMISSIVE CORS for auth errors
const addCorsHeaders = (res, origin) => {
  // Allow ANY origin in auth errors
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Vary', 'Origin');
};

const auth = async (req, res, next) => {
  const origin = req.headers.origin;
  
  try {
    await dbConnect();
    
    const authHeader = req.header('Authorization');
    
    // Debug: log what's coming in
    console.log('Auth Middleware Debug:', {
      path: req.path,
      origin: origin,
      hasAuthHeader: !!authHeader,
      authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : 'none'
    });
    
    // If no auth header, allow public access to certain endpoints
    // But for now, let's just require auth for everything
    if (!authHeader) {
      addCorsHeaders(res, origin);
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'No authorization header provided',
        note: 'This is a public endpoint but auth middleware is still checking'
      });
    }
    
    // Rest of your auth logic stays the same...
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
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

    req.token = token;
    req.user = user;
    
    console.log(`Authenticated user: ${user.email || user._id}`);
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    
    addCorsHeaders(res, origin);
    
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

    res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Please authenticate'
    });
  }
};

module.exports = auth;