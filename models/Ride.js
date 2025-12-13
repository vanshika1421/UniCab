const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  // Use a Date type for the ride time so we can validate booking windows
  time: { type: Date, required: true },
  seats: { type: Number, required: true },
  price: { type: Number, required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverName: String,
  contact: String
});

module.exports = mongoose.model('Ride', rideSchema);