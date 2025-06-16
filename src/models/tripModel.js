const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
  passengerId: {
    type: String,
    required: true
  },
  fromOrigin: {
    type: String,
    required: true
  },
    toDestination: {
    type: String,
    required: true
  },
  tripDate: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Trip', TripSchema);