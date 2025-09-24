
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config/default');

// Generate JWT token
const generateToken = (user) => {
	return jwt.sign(
		{
			id: user._id,
			username: user.username,
			role: user.role
		},
		config.jwtSecret,
		{ expiresIn: '7d' } // Token expires in 7 days
	);
};

// Register a new user
exports.register = async (req, res) => {
	try {
		const { username, password, role, driverName, contact } = req.body;
		if (!username || !password || !role) {
			return res.render('register', { error: 'All fields required' });
		}
		const existing = await User.findOne({ username });
		if (existing) {
			return res.render('register', { error: 'Username already exists' });
		}
		const hash = await bcrypt.hash(password, 10);
		const user = new User({ username, password: hash, role, driverName, contact });
		await user.save();
		
		// Generate JWT token
		const token = generateToken(user);
		
		// Set token in HTTP-only cookie
		res.cookie('token', token, { 
			httpOnly: true, 
			secure: process.env.NODE_ENV === 'production',
			maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
		});
		
		res.redirect('/');
	} catch (error) {
		console.error('Registration error:', error);
		res.render('register', { error: 'Registration failed' });
	}
};

// Login user
exports.login = async (req, res) => {
	try {
		const { username, password } = req.body;
		if (!username || !password) {
			return res.render('login', { error: 'All fields required' });
		}
		const user = await User.findOne({ username });
		if (!user) {
			return res.render('login', { error: 'Invalid credentials' });
		}
		const match = await bcrypt.compare(password, user.password);
		if (!match) {
			return res.render('login', { error: 'Invalid credentials' });
		}
		
		// Generate JWT token
		const token = generateToken(user);
		
		// Set token in HTTP-only cookie
		res.cookie('token', token, { 
			httpOnly: true, 
			secure: process.env.NODE_ENV === 'production',
			maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
		});
		
		res.redirect('/');
	} catch (error) {
		console.error('Login error:', error);
		res.render('login', { error: 'Login failed' });
	}
};

// Logout user
exports.logout = (req, res) => {
	res.clearCookie('token');
	res.redirect('/');
};
