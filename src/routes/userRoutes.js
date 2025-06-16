const express = require('express');
const router = express.Router();
const User = require('../models/userModel');

// @route   POST /api/users
// @desc    Create a new user
router.post('/', async (req, res) => {
  try {
    const { userEmail, firstName, lastName, isAdmin, homeLocation } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ userEmail });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const newUser = new User({
      userEmail,
      firstName,
      lastName,
      isAdmin: isAdmin || false, // Default to false if not provided
      homeLocation
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/users/:email
// @desc    Get user by email
router.get('/:email', async (req, res) => {
  try {
    const user = await User.findOne({ userEmail: req.params.email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/users/:email
// @desc    Update user by email
router.put('/:email', async (req, res) => {
  try {
    const { firstName, lastName, isAdmin, homeLocation } = req.body;
    
    const updatedUser = await User.findOneAndUpdate(
      { userEmail: req.params.email },
      { $set: { firstName, lastName, isAdmin, homeLocation } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/users/:email
// @desc    Delete user by email
router.delete('/:email', async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ userEmail: req.params.email });
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/users
// @desc    Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;