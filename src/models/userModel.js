const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true
  },
  firstName: {
    type: String
  },
    lastName: {
    type: String
  },
  isAdmin: {
    type: Boolean,
    required: true
  }
});

module.exports = mongoose.model('User', UserSchema);