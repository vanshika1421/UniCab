
const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');

router.get('/', async (req, res) => {
  const rides = await Ride.find().populate('driver');
  res.render('index', { rides });
});

module.exports = router;
