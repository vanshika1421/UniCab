
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const mongoose = require('mongoose');

// Book a ride (rider)
exports.bookRide = async (req, res) => {
	try {
		// Validate ObjectId
		if (!mongoose.Types.ObjectId.isValid(req.params.rideId)) {
			return res.status(400).send('Invalid ride ID');
		}
		
		const ride = await Ride.findById(req.params.rideId);
		if (!ride || ride.seats < 1) {
			return res.status(400).send('No seats available');
		}
		// User info is now available from JWT token
		const user = await User.findById(req.user.id);
		if (!user) {
			res.clearCookie('token');
			return res.redirect('/login');
		}
		ride.seats -= 1;
		await ride.save();
		const booking = new Booking({ rider: user._id, ride: ride._id });
		await booking.save();
		res.redirect('/mybookings');
	} catch (error) {
		console.error('Error booking ride:', error);
		return res.status(500).send('Error booking ride');
	}
};

// Get all bookings for a rider
exports.getMyBookings = async (req, res) => {
	try {
		// User info is now available from JWT token
		const user = await User.findById(req.user.id);
		if (!user) {
			res.clearCookie('token');
			return res.redirect('/login');
		}
		const bookings = await Booking.find({ rider: user._id }).populate('ride');
		res.render('mybookings', { bookings });
	} catch (error) {
		console.error('Error fetching bookings:', error);
		res.status(500).send('Error fetching bookings');
	}
};
