const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['driver', 'rider'], required: true },
  driverName: String,
  contact: String
});

module.exports = mongoose.model('User', userSchema);