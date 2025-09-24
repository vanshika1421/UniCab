
const Ride = require('../models/Ride');
const User = require('../models/User');

// Add a new ride (driver)
exports.addRide = async (req, res) => {
	try {
		const { from, to, time, seats, price, driverName, contact } = req.body;
		if (!from || !to || !time || !seats || !price || !driverName || !contact) {
			return res.status(400).send('All fields required');
		}
		// User info is now available from JWT token
		const user = await User.findById(req.user.id);
		if (!user) {
			res.clearCookie('token');
			return res.redirect('/login');
		}
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
	} catch (error) {
		console.error('Error adding ride:', error);
		res.status(500).send('Error adding ride');
	}
};

// Get all rides for a driver (notifications)
exports.getDriverNotifications = async (req, res) => {
	try {
		// User info is now available from JWT token
		const user = await User.findById(req.user.id);
		if (!user) {
			res.clearCookie('token');
			return res.redirect('/login');
		}
		const myRides = await Ride.find({ driver: user._id });
		const Booking = require('../models/Booking');
		const rideBookings = await Promise.all(myRides.map(async ride => {
			const bookings = await Booking.find({ ride: ride._id }).populate('rider');
			return { ride, bookings };
		}));
		res.render('driver_notifications', { rideBookings });
	} catch (error) {
		console.error('Error fetching driver notifications:', error);
		res.status(500).send('Error fetching notifications');
	}
};
