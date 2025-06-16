const express = require('express');
const router = express.Router();
const Trip = require('../models/tripModel');

// @route   POST /api/trips
// @desc    Create a new trip
router.post('/', async (req, res) => {
  try {
    const { passengerId, fromOrigin, toDestination, tripDate } = req.body;

    // Validate required fields
    if (!passengerId || !fromOrigin || !toDestination || !tripDate) {
      return res.status(400).json({ 
        error: 'All fields (passengerId, fromOrigin, toDestination, tripDate) are required' 
      });
    }

    const newTrip = new Trip({
      passengerId,
      fromOrigin,
      toDestination,
      tripDate
    });

    const savedTrip = await newTrip.save();
    res.status(201).json(savedTrip);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/trips
// @desc    Get all trips
router.get('/', async (req, res) => {
  try {
    const trips = await Trip.find();
    res.json(trips);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/trips/:id
// @desc    Get trip by ID
router.get('/:id', async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json(trip);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid trip ID format' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   GET /api/trips/passenger/:passengerId
// @desc    Get trips by passenger ID
router.get('/passenger/:passengerId', async (req, res) => {
  try {
    const trips = await Trip.find({ passengerId: req.params.passengerId });
    if (!trips || trips.length === 0) {
      return res.status(404).json({ error: 'No trips found for this passenger' });
    }
    res.json(trips);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/trips/:id
// @desc    Update trip by ID
router.put('/:id', async (req, res) => {
  try {
    const { passengerId, fromOrigin, toDestination, tripDate } = req.body;

    // Validate required fields
    if (!passengerId || !fromOrigin || !toDestination || !tripDate) {
      return res.status(400).json({ 
        error: 'All fields (passengerId, fromOrigin, toDestination, tripDate) are required' 
      });
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: { passengerId, fromOrigin, toDestination, tripDate } },
      { new: true, runValidators: true }
    );

    if (!updatedTrip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json(updatedTrip);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid trip ID format' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/trips/:id
// @desc    Delete trip by ID
router.delete('/:id', async (req, res) => {
  try {
    const deletedTrip = await Trip.findByIdAndDelete(req.params.id);
    if (!deletedTrip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    res.json({ message: 'Trip deleted successfully' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid trip ID format' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;