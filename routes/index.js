
const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
router.get('/', async (req, res) => {
  const rides = await Ride.find().populate('driver');
  res.render('index', { rides, user: res.locals.user, role: res.locals.role });
});

// Confirm a booking
router.post('/booking/:id/confirm', async (req, res) => {
  await Booking.findByIdAndUpdate(req.params.id, { status: 'confirmed' });
  res.redirect('/driver/notifications');
});

// Cancel a booking
router.post('/booking/:id/cancel', async (req, res) => {
  await Booking.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
  res.redirect('/driver/notifications');
});
module.exports = router;
