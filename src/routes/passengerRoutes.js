const express = require('express');
const router = express.Router();
const Passenger = require('../models/passengerModel');

// @route   POST /api/passengers
// @desc    Create a new passenger
router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, jobRole } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const newPassenger = new Passenger({
      firstName,
      lastName,
      jobRole
    });

    const savedPassenger = await newPassenger.save();
    res.status(201).json(savedPassenger);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/passengers
// @desc    Get all passengers
router.get('/', async (req, res) => {
  try {
    const passengers = await Passenger.find();
    res.json(passengers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/passengers/:id
// @desc    Get passenger by ID
router.get('/:id', async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.params.id);
    if (!passenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }
    res.json(passenger);
  } catch (err) {
    console.error(err.message);
    // Check if the error is due to invalid ID format
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid passenger ID format' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/passengers/:id
// @desc    Update passenger by ID
router.put('/:id', async (req, res) => {
  try {
    const { firstName, lastName, jobRole } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const updatedPassenger = await Passenger.findByIdAndUpdate(
      req.params.id,
      { $set: { firstName, lastName, jobRole } },
      { new: true, runValidators: true }
    );

    if (!updatedPassenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    res.json(updatedPassenger);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid passenger ID format' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/passengers/:id
// @desc    Delete passenger by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedPassenger = await Passenger.findByIdAndDelete(req.params.id);
    if (!deletedPassenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }
    res.json({ message: 'Passenger deleted successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid passenger ID format' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;