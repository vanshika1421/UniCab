const Ride = require('../models/Ride');
const User = require('../models/User');
const { pub, cacheDel } = require('../lib/redisClient');

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
		// Invalidate cached rides
		try { await cacheDel('rides:all'); } catch(e) { }

		// Publish ride.updated / ride.cancelled
		try { await pub.publish('ride.updated', JSON.stringify({ rideId, driver: userId, cancelled: true })); } catch (err) { console.warn('Failed to publish ride.updated', err && err.message ? err.message : err); }

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

		// Business rule: one side MUST be campus (driver either departing from or going to campus)
		// Allow flexible input but check case-insensitively and trim whitespace.
		const normalizedFrom = String(from).trim().toLowerCase();
		const normalizedTo = String(to).trim().toLowerCase();
		const isCampusInvolved = normalizedFrom.includes('campus') || normalizedTo.includes('campus');
		if (!isCampusInvolved) {
			return res.status(400).send("One side must be 'campus' — driver must be going to or departing from campus.");
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
		// Invalidate cached rides
		try { await cacheDel('rides:all'); } catch(e) { }

		// Publish ride.updated event
		try { await pub.publish('ride.updated', JSON.stringify({ rideId: ride._id, driver: userId })); } catch (err) { console.warn('Failed to publish ride.updated', err && err.message ? err.message : err); }

		res.redirect('/');
	} catch (error) {
		console.error('Error adding ride:', error);
		res.status(500).send('Error adding ride');
	}
};
exports.addRide = async (req, res) => {
  try {
    const { from, to, time, seats, price, driverName, contact } = req.body;
    const fromLat = req.body.fromLat;
    const fromLng = req.body.fromLng;
    const toLat = req.body.toLat;
    const toLng = req.body.toLng;

    if (!from || !to || !time || !seats || !price || !driverName || !contact) {
      return res.status(400).send('All fields required');
    }

    // One side must be campus
    const normalizedFrom = String(from).trim().toLowerCase();
    const normalizedTo = String(to).trim().toLowerCase();
    const isCampusInvolved = normalizedFrom.includes('campus') || normalizedTo.includes('campus');
    if(!isCampusInvolved) {
      return res.status(400).send("One side must be 'campus'.");
    }

    const userId = req.user.id;
		// Parse time into a Date and ensure it's in the future
		const parsedTime = new Date(time);
		if (Number.isNaN(parsedTime.getTime())) {
			return res.status(400).send('Invalid time format');
		}
		if (parsedTime <= new Date()) {
			return res.status(400).send('Ride time must be in the future');
		}

		const ride = new Ride({
			from, to, time: parsedTime,
			seats: parseInt(seats,10),
			price: parseFloat(price),
			driver: userId,
			driverName,
			contact,
			fromLat, fromLng, toLat, toLng
		});
    await ride.save();
    res.redirect('/');
  } catch(err) {
    console.error(err);
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
