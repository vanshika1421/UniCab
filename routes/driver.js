
const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { requireLogin, requireRole } = require('../middleware/auth');


router.get('/add', requireLogin, requireRole('driver'), (req, res) => {
  res.render('add');
});

router.post('/add', requireLogin, requireRole('driver'), async (req, res) => {
  const { from, to, time, seats, price, driverName, contact } = req.body;
  if (!from || !to || !time || !seats || !price || !driverName || !contact) {
    return res.status(400).send('All fields required');
  }
  const user = await User.findOne({ username: res.locals.user });
  const ride = new Ride({
    from,
    to,
    time,
    seats: parseInt(seats, 10),
    price: parseFloat(price),
    driver: user._id,
    driverName,
    contact
  });
  await ride.save();
  res.redirect('/');
});


router.get('/driver/notifications', requireLogin, requireRole('driver'), async (req, res) => {
  const user = await User.findOne({ username: res.locals.user });
  const myRides = await Ride.find({ driver: user._id });
  const rideBookings = await Promise.all(myRides.map(async ride => {
    const bookings = await Booking.find({ ride: ride._id }).populate('rider');
    return { ride, bookings };
  }));
  res.render('driver_notifications', { rideBookings });
});

module.exports = router;
