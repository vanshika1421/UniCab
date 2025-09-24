
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { requireLogin, requireRole } = require('../middleware/auth');



router.post('/book/:rideId', requireLogin, requireRole('rider'), bookingController.bookRide);



router.get('/mybookings', requireLogin, bookingController.getMyBookings);
// Cancel a booking (rider)
router.post('/cancel-booking/:bookingId', requireLogin, requireRole('rider'), bookingController.cancelBooking);


module.exports = router;
