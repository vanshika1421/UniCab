const Booking = require('../models/Booking');

// Minimal stubbed payment controller to avoid startup errors when payment
// features are not configured. These handlers are intentionally simple
// placeholders — they return a clear JSON response indicating payments
// are not enabled. Replace with full Stripe integration when ready.

exports.createPaymentIntent = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Placeholder behavior: inform client that payment backend is not configured
    return res.json({ success: false, message: 'Payment endpoints not configured on this server' });
  } catch (err) {
    console.error('createPaymentIntent error', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
};

exports.capturePayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const Booking = require('../models/Booking');
    const Ride = require('../models/Ride');
    const { pub } = require('../lib/redisClient');

    const booking = await Booking.findById(bookingId).populate('ride');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Only drivers who own the ride can capture
    if (!req.user || req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Only drivers may capture payments' });
    }
    const driverId = booking.ride && booking.ride.driver ? booking.ride.driver.toString() : null;
    if (driverId && driverId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to capture this booking' });
    }

    // Mark booking as captured
    booking.paymentStatus = 'captured';
    booking.chargedAt = new Date();
    // Accept optional transaction fields
    if (req.body && req.body.transactionId) booking.transactionId = req.body.transactionId;
    if (req.body && req.body.receiptUrl) booking.receiptUrl = req.body.receiptUrl;
    await booking.save();

    // Publish event to Redis for websocket/notifications
    try {
      await pub.publish('payment.captured', JSON.stringify({ bookingId: booking._id, rideId: booking.ride._id, transactionId: booking.transactionId || null }));
    } catch (err) {
      console.warn('Failed to publish payment.captured:', err && err.message ? err.message : err);
    }

    return res.json({ success: true, message: 'Payment captured', booking });
  } catch (err) {
    console.error('capturePayment error', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
};

// Simulate GPay or Cash payments for development/local testing
exports.simulateGPayCapture = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({ success: false, message: 'Invalid bookingId' });
    }
    const { payerName, payerAddress, carDetails, paymentOption, upiId } = req.body || {};
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Store payer metadata
    if (payerName) booking.payerName = payerName;
    if (payerAddress) booking.payerAddress = payerAddress;
    if (carDetails) booking.carDetails = carDetails;
    if (upiId) booking.upiId = upiId;
    booking.paymentOption = paymentOption || 'cash';

    // For simulation: mark as captured immediately for GPay and Cash so UI shows success
    booking.paymentStatus = 'captured';
    booking.chargedAt = new Date();
    booking.transactionId = `SIM-${Date.now()}`;
    await booking.save();

    // publish event
    try { const { pub } = require('../lib/redisClient'); await pub.publish('payment.captured', JSON.stringify({ bookingId: booking._id })); } catch(e){ }

    return res.json({ success: true, simulated: true, message: 'Payment simulated', bookingId: booking._id });
  } catch (err) {
    console.error('simulateGPayCapture error', err);
    return res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
};
