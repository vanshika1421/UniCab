
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/default');

// Register a new user
exports.register = async (req, res) => {
	try {
		let { username, email, password, role, driverName, contact } = req.body;

		// Basic sanitization
		username = username && String(username).trim();
		email = email && String(email).trim();
		role = role && String(role).trim();

		// Debug log
		console.log('🔍 Registration attempt:', { username, email, role, driverName, contact });

		if (!username || !password || !role) {
			console.log('❌ Missing required fields');
			return res.render('register', { error: 'Username, password and role are required' });
		}

		// Normalize for checks
		const orChecks = [ { username: { $regex: new RegExp(`^${username}$`, 'i') } } ];
		if (email) orChecks.push({ email: { $regex: new RegExp(`^${email}$`, 'i') } });

		console.log('🔍 Checking if username/email exists:', username, email);
		const existing = await User.findOne({ $or: orChecks });
		console.log('🔍 User exists?', existing ? 'YES' : 'NO');

		if (existing) {
			console.log('❌ Username or email already exists:', username, email);
			return res.render('register', { error: 'Username or email already exists' });
		}

		// Hash password
		console.log('🔐 Hashing password...');
		const hash = await bcrypt.hash(password, 10);
		console.log('🔐 Password hashed successfully');

		const user = new User({ username, email, password: hash, role, driverName, contact });
		await user.save();
		console.log('✅ User saved successfully:', user._id);

		// Generate JWT token
		const payload = {
			user: {
				id: user._id,
				username: user.username,
				role: user.role
			}
		};

		const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });

		// Set JWT as httpOnly cookie
		res.cookie('token', token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			maxAge: 24 * 60 * 60 * 1000 // 24 hours
		});

		res.redirect('/');
	} catch (error) {
		// Log full stack for debugging
		console.error('Registration error:', error && error.stack ? error.stack : error);

		// Handle duplicate key error explicitly
		if (error && error.code === 11000) {
			return res.render('register', { error: 'Username or email already exists' });
		}

		// In development show the underlying error message to help debugging
		const devMsg = (process.env.NODE_ENV !== 'production' && error && error.message) ? error.message : 'Registration failed. Please try again.';
		return res.render('register', { error: devMsg });
	}
};

// Login user
exports.login = async (req, res) => {
	try {
		const { username, password } = req.body;
		
		// Debug log
		console.log('🔍 Login attempt:', { username });
		
		if (!username || !password) {
			console.log('❌ Missing username or password');
			return res.render('login', { error: 'All fields required' });
		}
		
		// Find user (case-insensitive)
		console.log('🔍 Looking for user:', username);
		const user = await User.findOne({ 
			username: { $regex: new RegExp(`^${username}$`, 'i') } 
		});
		console.log('🔍 User found?', user ? 'YES' : 'NO');
		
		if (!user) {
			console.log('❌ User not found:', username);
			return res.render('login', { error: 'Invalid credentials' });
		}
		
		// Check password
		console.log('🔐 Checking password...');
		const match = await bcrypt.compare(password, user.password);
		console.log('🔐 Password match?', match ? 'YES' : 'NO');
		
		if (!match) {
			console.log('❌ Password mismatch for user:', username);
			return res.render('login', { error: 'Invalid credentials' });
		}
		
		console.log('✅ Login successful for user:', username);
		
		// Generate JWT token
		const payload = {
			user: {
				id: user._id,
				username: user.username,
				role: user.role
			}
		};
		
		const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
		
		// Set JWT as httpOnly cookie
		res.cookie('token', token, { 
			httpOnly: true, 
			secure: process.env.NODE_ENV === 'production',
			maxAge: 24 * 60 * 60 * 1000 // 24 hours
		});
		
		res.redirect('/');
	} catch (error) {
		console.error('Login error:', error);
		res.render('login', { error: 'Login failed. Please try again.' });
	}
};

// Logout user
exports.logout = (req, res) => {
	res.clearCookie('token');
	res.redirect('/');
};
