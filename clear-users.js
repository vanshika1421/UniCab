require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const config = require('./config/default');

async function clearUsers() {
    await mongoose.connect(config.mongoURI);
    await User.deleteMany({});
    console.log('🗑️ Cleared all users');
    process.exit(0);
}

clearUsers().catch(console.error);