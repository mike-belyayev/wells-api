const express = require('express');
const router = express.Router();
const Trip = require('../models/tripModel');

// @route   POST /api/trips
// @desc    Create a new trip
router.post('/', async (req, res) => {
  try {
    const { passengerId, fromOrigin, toDestination, tripDate, confirmed, numberOfPassengers } = req.body;

    // Validate required fields (numberOfPassengers is optional)
    if (!passengerId || !fromOrigin || !toDestination || !tripDate || typeof confirmed === 'undefined') {
      return res.status(400).json({ 
        error: 'All fields (passengerId, fromOrigin, toDestination, tripDate, confirmed) are required' 
      });
    }

    const newTrip = new Trip({
      passengerId,
      fromOrigin,
      toDestination,
      tripDate,
      confirmed,
      numberOfPassengers // Add this line
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
    const { passengerId, fromOrigin, toDestination, tripDate, confirmed, numberOfPassengers } = req.body;

    // Validate required fields (numberOfPassengers is optional)
    if (!passengerId || !fromOrigin || !toDestination || !tripDate || typeof confirmed === 'undefined') {
      return res.status(400).json({ 
        error: 'All fields (passengerId, fromOrigin, toDestination, tripDate, confirmed) are required' 
      });
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: { passengerId, fromOrigin, toDestination, tripDate, confirmed, numberOfPassengers } }, // Add numberOfPassengers
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

// @route   PATCH /api/trips/:id/confirm
// @desc    Update trip confirmation status
router.patch('/:id/confirm', async (req, res) => {
  try {
    const { confirmed } = req.body;

    if (typeof confirmed === 'undefined') {
      return res.status(400).json({ 
        error: 'Confirmed field is required' 
      });
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: { confirmed } },
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

// @route   PATCH /api/trips/:id/passengers/increment
// @desc    Increment number of passengers
router.patch('/:id/passengers/increment', async (req, res) => {
  try {
    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { 
        $inc: { numberOfPassengers: 1 } // Increment by 1
      },
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

// @route   PATCH /api/trips/:id/passengers/decrement
// @desc    Decrement number of passengers (minimum 1)
router.patch('/:id/passengers/decrement', async (req, res) => {
  try {
    // First get the current trip to check the current value
    const currentTrip = await Trip.findById(req.params.id);
    if (!currentTrip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Don't decrement below 1
    if (currentTrip.numberOfPassengers <= 1) {
      return res.status(400).json({ error: 'Number of passengers cannot be less than 1' });
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { 
        $inc: { numberOfPassengers: -1 } // Decrement by 1
      },
      { new: true, runValidators: true }
    );

    res.json(updatedTrip);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ error: 'Invalid trip ID format' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   PATCH /api/trips/:id/passengers/set
// @desc    Set specific number of passengers
router.patch('/:id/passengers/set', async (req, res) => {
  try {
    const { numberOfPassengers } = req.body;

    if (typeof numberOfPassengers === 'undefined') {
      return res.status(400).json({ 
        error: 'numberOfPassengers field is required' 
      });
    }

    if (numberOfPassengers < 1 || !Number.isInteger(numberOfPassengers)) {
      return res.status(400).json({ 
        error: 'numberOfPassengers must be a positive integer' 
      });
    }

    const updatedTrip = await Trip.findByIdAndUpdate(
      req.params.id,
      { $set: { numberOfPassengers } },
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

module.exports = router;