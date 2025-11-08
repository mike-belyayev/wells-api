const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST /api/users/register
// @desc    Register a new user (active immediately)
router.post('/register', async (req, res) => {
  try {
    const { userEmail, password, firstName, lastName, homeLocation } = req.body;

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ userEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create new user (active immediately)
    const newUser = new User({
      userEmail,
      password,
      firstName,
      lastName,
      homeLocation,
      isAdmin: false
    });

    const savedUser = await newUser.save();

    // Return user without password
    const userToReturn = savedUser.toObject();
    delete userToReturn.password;

    res.status(201).json(userToReturn);
  } catch (err) {
    console.error('Registration Error:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST /api/users/login
// @desc    Login user
router.post('/login', async (req, res) => {
  try {
    const { userEmail, password } = req.body;

    // Find user by email including password
    const user = await User.findOne({ userEmail }).select('+password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate JWT token
    const token = await user.generateAuthToken();

    // Return user info (without sensitive data) and token
    const userToReturn = user.toObject();
    delete userToReturn.password;
    delete userToReturn.tokens;

    res.json({ 
      user: userToReturn,
      token
    });
  } catch (err) {
    console.error('Login Error:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/users/me
// @desc    Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get Profile Error:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/users/me
// @desc    Update current user profile
router.put('/me', auth, async (req, res) => {
  try {
    const { firstName, lastName, homeLocation } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { firstName, lastName, homeLocation } },
      { new: true, runValidators: true }
    ).select('-password');

    res.json(updatedUser);
  } catch (err) {
    console.error('Update Profile Error:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ADMIN ROUTES //

// @route   GET /api/users
// @desc    Get all users (Admin only)
router.get('/', [auth, admin], async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('Get All Users Error:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
router.get('/:id', [auth, admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get User by ID Error:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user by ID (Admin only)
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const { firstName, lastName, isAdmin, homeLocation } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { firstName, lastName, isAdmin, homeLocation } },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error('Update User Error:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user by ID (Admin only)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete User Error:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;