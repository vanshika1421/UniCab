require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/unicab';

(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const username = process.argv[2] || 'abhay';
    const user = await User.findOne({ username: new RegExp(`^${username}$`, 'i') }).lean();
    if (!user) {
      console.log('User not found:', username);
    } else {
      console.log('User found:', user.username);
      console.log('  _id:', user._id);
      console.log('  email:', user.email || '(none)');
      console.log('  contact:', user.contact || '(none)');
      console.log('  role:', user.role);
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error checking driver email:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
