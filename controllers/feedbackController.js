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
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).send('Booking not found');

    const feedback = new Feedback({
        bookingId,
        driverId: booking.ride.driver,
        riderId: booking.rider,
        rating,
        comment,
        timestamp: new Date()
    });

    await feedback.save();
    res.send('Thank you for your feedback!');
};
