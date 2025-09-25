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
});

module.exports = mongoose.model('Booking', bookingSchema);