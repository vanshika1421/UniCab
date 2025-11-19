const express = require('express');
const router = express.Router();
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
let PDFDocument = null;
try {
  PDFDocument = require('pdfkit');
} catch (err) {
  console.warn('pdfkit not available — PDF receipt generation disabled. Install with `npm install pdfkit` to enable.');
}

// Receipt PDF generator
router.get('/receipt/:id', async (req, res) => {
  try {
    const bookingId = req.params.id;
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(bookingId)) return res.status(400).send('Invalid booking id');
    const booking = await Booking.findById(bookingId).populate('ride').populate('rider');
    if (!booking) return res.status(404).send('Booking not found');

    // If client explicitly asks for HTML view, render the EJS template
    if (req.query.view === 'html' || req.headers.accept && req.headers.accept.indexOf('text/html') !== -1 && !req.query.pdf) {
      return res.render('receipt', { booking });
    }

    // If PDF generator not available, fall back to HTML view
    if (!PDFDocument) {
      return res.render('receipt', { booking });
    }

    // Generate PDF receipt
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt-${booking._id}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).text('UniCab - Payment Receipt', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Receipt ID: ${booking._id}`);
    doc.text(`Booking Date: ${booking.bookedAt ? new Date(booking.bookedAt).toLocaleString() : 'N/A'}`);
    if (booking.ride) {
      doc.text(`Route: ${booking.ride.from} → ${booking.ride.to}`);
      doc.text(`Driver: ${booking.ride.driverName || booking.ride.driver}`);
    }
    doc.moveDown();
    doc.text(`Rider: ${booking.rider ? (booking.rider.username || booking.rider.toString()) : 'N/A'}`);
    doc.text(`Payment Status: ${booking.paymentStatus || 'none'}`);
    const amount = booking.amount != null ? (booking.amount / 100).toFixed(2) : (booking.ride && booking.ride.price ? booking.ride.price : 'N/A');
    doc.text(`Amount: ${amount} ${booking.currency || 'USD'}`);
    if (booking.transactionId) doc.text(`Transaction ID: ${booking.transactionId}`);
    if (booking.payerName) doc.text(`Payer: ${booking.payerName}`);
    if (booking.payerAddress) doc.text(`Payer Address: ${booking.payerAddress}`);
    if (booking.upiId) doc.text(`UPI / VPA: ${booking.upiId}`);

    doc.moveDown();
    doc.text('Thank you for using UniCab!', { align: 'center' });
    doc.end();
  } catch (err) {
    console.error('Error generating receipt PDF', err);
    return res.status(500).send('Error generating receipt');
  }
});
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
