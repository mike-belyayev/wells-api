const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const auth = async (req, res, next) => {
  try {
    // 1. Get and validate token
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Please authenticate' });
    }
    
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Find user - choose one of these options:
    
    // Option A: If your User model has a tokens array (for multiple device support)
    // const user = await User.findOne({ 
    //   _id: decoded._id, 
    //   'tokens.token': token 
    // });
    
    // Option B: If you're not tracking multiple tokens
    const user = await User.findById(decoded._id);
    
    if (!user) {
      return res.status(401).json({ error: 'Please authenticate' });
    }

    // 4. Attach user and token to request
    req.token = token;
    req.user = user;
    next();
  } catch (err) {
    console.error('Authentication error:', err.message);
    res.status(401).json({ error: 'Please authenticate' });
  }
};

module.exports = auth;