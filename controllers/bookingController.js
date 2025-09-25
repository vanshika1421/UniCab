const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const mongoose = require('mongoose');

// Cancel a booking (rider)
exports.cancelBooking = async (req, res) => {
	try {
		const bookingId = req.params.bookingId;
		if (!mongoose.Types.ObjectId.isValid(bookingId)) {
			return res.status(400).send('Invalid booking ID');
		}
		
		// Get user from JWT token
		const userId = req.user.id;
		const booking = await Booking.findById(bookingId).populate('ride');
		
		if (!booking || booking.rider.toString() !== userId.toString()) {
			return res.status(403).send('Unauthorized or booking not found');
		}
		
		// Increase seat count back
		const ride = await Ride.findById(booking.ride._id);
		if (ride) {
			ride.seats += 1;
			await ride.save();
		}
		await Booking.findByIdAndDelete(bookingId);
		res.redirect('/mybookings');
	} catch (error) {
		console.error('Error cancelling booking:', error);
		res.status(500).send('Error cancelling booking');
	}
};

// Book a ride (rider)
exports.bookRide = async (req, res) => {
	try {
		console.log('Received rideId:', req.params.rideId);
		console.log('rideId type:', typeof req.params.rideId);
		console.log('rideId length:', req.params.rideId.length);
		
		// Validate ObjectId
		if (!mongoose.Types.ObjectId.isValid(req.params.rideId)) {
			console.log('ObjectId validation failed for:', req.params.rideId);
			return res.status(400).send('Invalid ride ID');
		}
		
		const ride = await Ride.findById(req.params.rideId);
		if (!ride || ride.seats < 1) {
			return res.status(400).send('No seats available');
		}
		
		// Get user from JWT token
		const userId = req.user.id;
		
		ride.seats -= 1;
		await ride.save();
		const booking = new Booking({ rider: userId, ride: ride._id });
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
		// Get user from JWT token
		const userId = req.user.id;
		const bookings = await Booking.find({ rider: userId }).populate('ride');
		res.render('mybookings', { bookings });
	} catch (error) {
		console.error('Error fetching bookings:', error);
		res.status(500).send('Error fetching bookings');
	}
};
