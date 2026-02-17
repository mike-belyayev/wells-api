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
      validator: function(value) {
        // Allow null/undefined, or positive integers
        return value === null || value === undefined || (Number.isInteger(value) && value >= 1);
      },
      message: 'Number of passengers must be a positive integer or empty'
    },
    default: null
  },
  // NEW: Sort indices for persistent ordering
  sortIndices: {
    type: Map,
    of: {
      type: Number,
      min: 0
    },
    default: new Map() // This ensures backward compatibility
  }
}, {
  timestamps: true // Optional: adds createdAt and updatedAt automatically
});

// Optional: Add a pre-save middleware to ensure sortIndices exists
TripSchema.pre('save', function(next) {
  if (!this.sortIndices) {
    this.sortIndices = new Map();
  }
  next();
});

module.exports = mongoose.model('Trip', TripSchema);