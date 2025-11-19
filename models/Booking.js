const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ride: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
  bookedAt: { type: Date, default: Date.now },
  status: {
  type: String,
  enum: ['pending', 'confirmed', 'cancelled'],
  default: 'pending'
}
  // Payment fields
  , paymentStatus: {
    type: String,
    enum: ['none', 'requires_capture', 'captured', 'failed'],
    default: 'none'
  },
  paymentIntentId: { type: String },
  transactionId: { type: String },
  receiptUrl: { type: String },
  amount: { type: Number }, // amount in the smallest currency unit (e.g. cents)
  currency: { type: String, default: 'usd' },
  chargedAt: { type: Date }
});

module.exports = mongoose.model('Booking', bookingSchema);