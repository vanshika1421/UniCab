const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  // Make email optional for existing users; use sparse unique index to allow multiple nulls
  email: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['driver', 'rider'], required: true },
  driverName: String,
  contact: String
});

module.exports = mongoose.model('User', userSchema);