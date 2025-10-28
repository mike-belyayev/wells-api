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
  },
  confirmed: {
    type: Boolean,
    required: true
  },
  numberOfPassengers: {
  type: Number,
  min: 1,
  validate: {
    validator: Number.isInteger,
    message: '{VALUE} is not an integer value'
  },
  default: undefined
}
});

module.exports = mongoose.model('Trip', TripSchema);