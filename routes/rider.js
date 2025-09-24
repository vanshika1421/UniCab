
const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { requireLogin, requireRole } = require('../middleware/auth');



router.post('/book/:rideId', requireLogin, requireRole('rider'), async (req, res) => {
  const ride = await Ride.findById(req.params.rideId);
  if (!ride || ride.seats < 1) {
    return res.status(400).send('No seats available');
  }
  const user = await User.findOne({ username: res.locals.user });
  if (!user) {
    res.clearCookie('user');
    res.clearCookie('role');
    return res.redirect('/login');
  }
  ride.seats -= 1;
  await ride.save();
  const booking = new Booking({ rider: user._id, ride: ride._id });
  await booking.save();
  res.redirect('/mybookings');
});



router.get('/mybookings', requireLogin, async (req, res) => {
  const user = await User.findOne({ username: res.locals.user });
  if (!user) {
    res.clearCookie('user');
    res.clearCookie('role');
    return res.redirect('/login');
  }
  const bookings = await Booking.find({ rider: user._id }).populate('ride');
  res.render('mybookings', { bookings });
});

module.exports = router;
