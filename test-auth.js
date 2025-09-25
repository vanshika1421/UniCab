// Test script to check authentication
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const config = require('./config/default');

async function testAuth() {
    try {
        // Connect to MongoDB
        await mongoose.connect(config.mongoURI);
        console.log('✅ Connected to MongoDB:', config.mongoURI);
        
        // List all users
        const users = await User.find();
        console.log('👥 Current users in database:', users.length);
        users.forEach(user => {
            console.log(`  - ${user.username} (${user.role})`);
        });
        
        // Clear database option (uncomment if needed)
        // await User.deleteMany({});
        // console.log('🗑️  Cleared all users');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testAuth();