const express = require('express');
const router = express.Router();
const Site = require('../models/siteModel');

// @route   GET /api/sites
// @desc    Get all sites
router.get('/', async (req, res) => {
  try {
    const sites = await Site.find().sort({ siteName: 1 });
    res.json(sites);
  } catch (err) {
    console.error('Error fetching sites:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   PUT /api/sites/:siteName/pob
// @desc    Update POB for a specific site (manual update)
router.put('/:siteName/pob', async (req, res) => {
  try {
    const { currentPOB } = req.body;

    // Validate required fields
    if (currentPOB === undefined || currentPOB === null) {
      return res.status(400).json({ 
        error: 'currentPOB field is required' 
      });
    }

    if (!Number.isInteger(currentPOB) || currentPOB < 0) {
      return res.status(400).json({ 
        error: 'currentPOB must be a non-negative integer' 
      });
    }

    const updatedSite = await Site.findOneAndUpdate(
      { siteName: req.params.siteName },
      { 
        currentPOB,
        pobUpdatedDate: new Date() // Store as Date object
      },
      { new: true, upsert: true } // Create if doesn't exist
    );

    res.json(updatedSite);
  } catch (err) {
    console.error('Error updating POB:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST /api/sites/initialize
// @desc    Initialize all sites with default values
router.post('/initialize', async (req, res) => {
  try {
    const locations = ['Ogle', 'NTM', 'NSC', 'NDT', 'NBD', 'STC'];
    const defaultMaximumPOB = 200;
    
    const operations = locations.map(siteName => ({
      updateOne: {
        filter: { siteName },
        update: {
          $setOnInsert: {
            siteName,
            currentPOB: 0,
            maximumPOB: defaultMaximumPOB,
            pobUpdatedDate: new Date()
          }
        },
        upsert: true
      }
    }));

    await Site.bulkWrite(operations);
    
    const sites = await Site.find();
    res.status(201).json({
      message: 'Sites initialized successfully',
      sites: sites
    });
  } catch (err) {
    console.error('Error initializing sites:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

module.exports = router;