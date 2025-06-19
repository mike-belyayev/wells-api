const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST /api/users/register
// @desc    Register a new user (unverified)
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

    // Create new unverified user
    const newUser = new User({
      userEmail,
      password,
      firstName,
      lastName,
      homeLocation,
      isAdmin: false,
      isVerified: false
    });

    const savedUser = await newUser.save();
    
    // Send verification request to admin
    await sendVerificationEmail(userEmail);

    // Return user without password
    const userToReturn = savedUser.toObject();
    delete userToReturn.password;
    delete userToReturn.resetPasswordToken;
    delete userToReturn.resetPasswordExpire;

    res.status(201).json(userToReturn);
  } catch (err) {
    console.error(err.message);
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

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({ error: 'Account not verified by admin' });
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
    const token = user.generateAuthToken();

    // Return user info (without sensitive data) and token
    const userToReturn = user.toObject();
    delete userToReturn.password;
    delete userToReturn.resetPasswordToken;
    delete userToReturn.resetPasswordExpire;

    res.json({ 
      user: userToReturn,
      token 
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST /api/users/forgot-password
// @desc    Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { userEmail } = req.body;

    const user = await User.findOne({ userEmail });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate and save reset token
    const resetToken = user.getResetPasswordToken();
    await user.save();

    // Send email with reset token
    await sendPasswordResetEmail(userEmail, resetToken);

    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/users/reset-password/:resetToken
// @desc    Reset password
router.put('/reset-password/:resetToken', async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({ 
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/users/me
// @desc    Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpire');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
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
    ).select('-password -resetPasswordToken -resetPasswordExpire');

    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ADMIN ROUTES //

// @route   GET /api/users/unverified
// @desc    Get all unverified users (Admin only)
router.get('/unverified', [auth, admin], async (req, res) => {
  try {
    const users = await User.find({ isVerified: false })
      .select('-password -resetPasswordToken -resetPasswordExpire');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/users/verify/:userId
// @desc    Verify a user (Admin only)
router.put('/verify/:userId', [auth, admin], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $set: { isVerified: true } },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpire');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/users
// @desc    Get all users (Admin only)
router.get('/', [auth, admin], async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpire');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (Admin only)
router.get('/:id', [auth, admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -resetPasswordToken -resetPasswordExpire');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
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
    ).select('-password -resetPasswordToken -resetPasswordExpire');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
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
    console.error(err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;