
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const { requireLogin, requireRole } = require('../middleware/auth');


router.get('/admin', requireLogin, requireRole('admin'), async (req, res) => {
  const users = await User.find();
  const rides = await Ride.find().populate('driver');
  const bookings = await Booking.find().populate('rider ride');
  res.render('admin', { users, rides, bookings });
});

module.exports = router;
