const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();

// Initialize Express
const app = express();
app.use('/api/example', require('./routes/exampleRoutes'));

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get('/', (req, res) => {
  res.send('API Running');
});

// Define Routes
// app.use('/api/example', require('./routes/exampleRoutes'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});