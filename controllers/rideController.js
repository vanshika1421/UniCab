const Ride = require('../models/Ride');
const User = require('../models/User');

// Cancel a ride (driver)
exports.cancelRide = async (req, res) => {
	try {
		const rideId = req.params.rideId;
		const user = await User.findOne({ username: res.locals.user });
		if (!user) {
			res.clearCookie('user');
			res.clearCookie('role');
			return res.redirect('/login');
		}
		const ride = await Ride.findById(rideId);
		if (!ride || ride.driver.toString() !== user._id.toString()) {
			return res.status(403).send('Unauthorized or ride not found');
		}
		// Delete all bookings for this ride
		const Booking = require('../models/Booking');
		await Booking.deleteMany({ ride: rideId });
		await Ride.findByIdAndDelete(rideId);
		res.redirect('/driver/notifications');
	} catch (error) {
		console.error('Error cancelling ride:', error);
		res.status(500).send('Error cancelling ride');
	}
};

// Add a new ride (driver)
exports.addRide = async (req, res) => {
	const { from, to, time, seats, price, driverName, contact } = req.body;
	if (!from || !to || !time || !seats || !price || !driverName || !contact) {
		return res.status(400).send('All fields required');
	}
	const user = await User.findOne({ username: res.locals.user });
	const ride = new Ride({
		from,
		to,
		time,
		seats: parseInt(seats, 10),
		price: parseFloat(price),
		driver: user._id,
		driverName,
		contact
	});
	await ride.save();
	res.redirect('/');
};

// Get all rides for a driver (notifications)
exports.getDriverNotifications = async (req, res) => {
	const user = await User.findOne({ username: res.locals.user });
	const myRides = await Ride.find({ driver: user._id });
	const Booking = require('../models/Booking');
	const rideBookings = await Promise.all(myRides.map(async ride => {
		const bookings = await Booking.find({ ride: ride._id }).populate('rider');
		return { ride, bookings };
	}));
	res.render('driver_notifications', { rideBookings });
};
