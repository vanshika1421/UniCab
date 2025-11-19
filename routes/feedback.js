const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { requireLogin } = require('../middleware/auth'); 

// Render feedback page
router.get('/:bookingId', requireLogin, feedbackController.renderFeedbackForm);

// Handle feedback submission
router.post('/:bookingId', requireLogin, feedbackController.submitFeedback);

module.exports = router;
