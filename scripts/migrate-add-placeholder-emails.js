require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/unicab';

(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const users = await User.find({ $or: [ { email: { $exists: false } }, { email: null } ] });
    if (!users.length) {
      console.log('No users without email found. Nothing to do.');
      await mongoose.disconnect();
      return process.exit(0);
    }
    console.log('Found', users.length, 'users without email. They will be assigned placeholder emails:');
    for (const u of users) {
      const placeholder = `${u.username.replace(/[^a-z0-9]/gi,'').toLowerCase() || u._id}@example.com`;
      console.log(' -', u.username, '->', placeholder);
      u.email = placeholder;
      await u.save();
    }
    console.log('Migration complete. Please review users and update to real emails where needed.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
