const express = require('express');
const router = express.Router();
const Passenger = require('../models/passengerModel');
const Trip = require('../models/tripModel'); // Import Trip model
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST /api/passengers
// @desc    Create a new passenger
router.post('/', [auth, admin], async (req, res) => {
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
router.get('/', auth, async (req, res) => {
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
router.get('/:id', auth, async (req, res) => {
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
router.put('/:id', [auth, admin], async (req, res) => {
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
// @desc    Delete passenger by ID and all associated trips
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const passengerId = req.params.id;
    
    // First, check if passenger exists
    const passenger = await Passenger.findById(passengerId);
    if (!passenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    // Delete all trips associated with this passenger
    const deleteTripsResult = await Trip.deleteMany({ passengerId });
    console.log(`Deleted ${deleteTripsResult.deletedCount} trips for passenger ${passengerId}`);

    // Then delete the passenger
    const deletedPassenger = await Passenger.findByIdAndDelete(passengerId);

    res.json({ 
      message: 'Passenger and associated trips deleted successfully',
      tripsDeleted: deleteTripsResult.deletedCount
    });
  } catch (err) {
    console.error('Delete Passenger Error:', err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid passenger ID format' });
    }
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;