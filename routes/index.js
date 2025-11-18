const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
router.get('/', async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q).trim() : '';
    const mode = req.query.mode === 'from' ? 'from' : req.query.mode === 'to' ? 'to' : '';
    const fromParam = req.query.from ? String(req.query.from).trim() : '';
    const toParam = req.query.to ? String(req.query.to).trim() : '';
    const seatsReq = req.query.seats ? parseInt(req.query.seats, 10) : 0;
    let filter = {};

    if (fromParam) {
      const regex = new RegExp(fromParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.from = regex;
    } else if (toParam) {
      const regex = new RegExp(toParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.to = regex;
    } else if (q && q.length > 0) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (mode === 'from') filter.from = regex;
      else if (mode === 'to') filter.to = regex;
      else filter.$or = [{ from: regex }, { to: regex }];
    }

    if (seatsReq && !isNaN(seatsReq)) {
      filter.seats = { $gte: seatsReq };
    }

    // If a specific campusLocation was chosen, prefer that exact match for the chosen side
    const campusLocation = req.query.campusLocation ? String(req.query.campusLocation).trim() : '';
    if (campusLocation) {
      const campusRegex = new RegExp(campusLocation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (mode === 'from') filter.from = campusRegex;
      else if (mode === 'to') filter.to = campusRegex;
      else filter.$or = [{ from: campusRegex }, { to: campusRegex }];
    }

    // Only perform the DB query when the user provided at least one search input
    const hasSearch = Boolean(q || campusLocation || (seatsReq && seatsReq > 0) || mode);

    // If the visitor is a logged-in driver and they didn't perform a search, send them
    // to the driver notifications/dashboard instead of the rider search homepage.
    if (res.locals && res.locals.role === 'driver' && !hasSearch) {
      return res.redirect('/driver/notifications');
    }

    let rides = [];
    if (hasSearch) {
      rides = await Ride.find(filter).populate('driver');
    }

    res.render('index', { rides, user: res.locals.user, role: res.locals.role, q, mode, seats: seatsReq, campusLocation, searched: hasSearch, from: fromParam, to: toParam });
  } catch (err) {
    console.error('Error fetching rides:', err);
    res.status(500).send('Error fetching rides');
  }
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
