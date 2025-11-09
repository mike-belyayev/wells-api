const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST /api/users/register
// @desc    Register a new user (active immediately)
router.post('/register', async (req, res) => {
  try {
    const { userName, password, firstName, lastName, homeLocation, isAdmin } = req.body;

    // Validate username format
    if (!/^[a-zA-Z0-9\-]+$/.test(userName)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and hyphens' });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ userName });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new user (active immediately)
    const newUser = new User({
      userName,
      password,
      firstName,
      lastName,
      homeLocation,
      isAdmin: isAdmin || false
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
    const { userName, password } = req.body;

    // Find user by username including password
    const user = await User.findOne({ userName }).select('+password');
    
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
// @desc    Update current user profile (including password)
router.put('/me', auth, async (req, res) => {
  try {
    const { firstName, lastName, homeLocation, currentPassword, newPassword } = req.body;
    
    // Find the current user with password
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If changing password, validate current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set new password' });
      }
      
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters' });
      }
      
      // Set new password - will be hashed by pre-save middleware
      user.password = newPassword;
    }

    // Update other fields
    const updateFields = {};
    if (firstName !== undefined) updateFields.firstName = firstName;
    if (lastName !== undefined) updateFields.lastName = lastName;
    if (homeLocation !== undefined) updateFields.homeLocation = homeLocation;

    // Update user with all fields
    Object.assign(user, updateFields);
    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(req.user.id).select('-password');
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
// @desc    Update user by ID (Admin only - can update all fields including password)
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const { userName, firstName, lastName, isAdmin, homeLocation, password } = req.body;
    
    // Find user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username is being changed and if it's available
    if (userName && userName !== user.userName) {
      if (!/^[a-zA-Z0-9\-]+$/.test(userName)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and hyphens' });
      }
      
      const existingUser = await User.findOne({ userName });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      user.userName = userName;
    }

    // Update other fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (homeLocation !== undefined) user.homeLocation = homeLocation;
    if (isAdmin !== undefined) user.isAdmin = isAdmin;
    
    // Update password if provided
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      user.password = password;
    }

    // Save the updated user
    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(req.params.id).select('-password');
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