const Ride = require('../models/Ride');
const User = require('../models/User');

// Cancel a ride (driver)
exports.cancelRide = async (req, res) => {
	try {
		const rideId = req.params.rideId;
		
		// Get user from JWT token
		const userId = req.user.id;
		
		const ride = await Ride.findById(rideId);
		if (!ride || ride.driver.toString() !== userId.toString()) {
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
	try {
		const { from, to, time, seats, price, driverName, contact } = req.body;
		if (!from || !to || !time || !seats || !price || !driverName || !contact) {
			return res.status(400).send('All fields required');
		}
		
		// Get user from JWT token
		const userId = req.user.id;
		
		const ride = new Ride({
			from,
			to,
			time,
			seats: parseInt(seats, 10),
			price: parseFloat(price),
			driver: userId,
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
		// Get user from JWT token
		const userId = req.user.id;
		
		const myRides = await Ride.find({ driver: userId });
		const Booking = require('../models/Booking');
		const rideBookings = await Promise.all(myRides.map(async ride => {
			const bookings = await Booking.find({ ride: ride._id }).populate('rider');
			return { ride, bookings };
		}));
		res.render('driver_notifications', { rideBookings });
	} catch (error) {
		console.error('Error fetching driver notifications:', error);
		res.status(500).send('Error fetching driver notifications');
	}
};
