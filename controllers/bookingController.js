
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');

// Book a ride (rider)
exports.bookRide = async (req, res) => {
	const ride = await Ride.findById(req.params.rideId);
	if (!ride || ride.seats < 1) {
		return res.status(400).send('No seats available');
	}
	const user = await User.findOne({ username: res.locals.user });
	if (!user) {
		res.clearCookie('user');
		res.clearCookie('role');
		return res.redirect('/login');
	}
	ride.seats -= 1;
	await ride.save();
	const booking = new Booking({ rider: user._id, ride: ride._id });
	await booking.save();
	res.redirect('/mybookings');
};

// Get all bookings for a rider
exports.getMyBookings = async (req, res) => {
	const user = await User.findOne({ username: res.locals.user });
	if (!user) {
		res.clearCookie('user');
		res.clearCookie('role');
		return res.redirect('/login');
	}
	const bookings = await Booking.find({ rider: user._id }).populate('ride');
	res.render('mybookings', { bookings });
};
