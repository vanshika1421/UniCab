const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  time: { type: String, required: true },
  seats: { type: Number, required: true },
  price: { type: Number, required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driverName: String,
  contact: String
});

module.exports = mongoose.model('Ride', rideSchema);