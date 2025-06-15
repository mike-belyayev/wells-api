const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    const connectionOptions = {
      maxPoolSize: 10, // Maximum number of connections in the pool
      serverSelectionTimeoutMS: 5000, // Timeout for server selection
      socketTimeoutMS: 45000 // Close sockets after 45 seconds of inactivity
    };

    // Enable debug mode in development environment
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }

    await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

// Event listeners for MongoDB connection
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from DB');
});

// Close the Mongoose connection when the Node process ends
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('Mongoose connection closed due to app termination');
  process.exit(0);
});

module.exports = connectDB;