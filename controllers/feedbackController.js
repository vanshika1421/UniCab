const Feedback = require('../models/Feedback'); // feedback model
const Booking = require('../models/Booking'); // if you want to check booking

// Render feedback form
exports.renderFeedbackForm = async (req, res) => {
    const bookingId = req.params.bookingId;
    // Optional: fetch booking to show details
    const booking = await Booking.findById(bookingId).populate('ride');
    if (!booking) return res.status(404).send('Booking not found');

    res.render('feedback', { booking });
};

// Handle form submission
exports.submitFeedback = async (req, res) => {
    const bookingId = req.params.bookingId;
    const { rating, comment } = req.body;
    // populate ride so we can read ride.driver
    const booking = await Booking.findById(bookingId).populate('ride');
    if (!booking) return res.status(404).send('Booking not found');

    // defensive: ensure ride and driver exist
    if (!booking.ride || !booking.ride.driver) {
        return res.status(400).send('Cannot submit feedback: ride or driver information missing for this booking');
    }

    const feedback = new Feedback({
        bookingId,
        driverId: booking.ride.driver,
        riderId: booking.rider,
        rating,
        comment
    });

    await feedback.save();
    // render a styled thank-you page instead of plain text
    return res.render('feedback_thanks', { booking, feedback });
};
