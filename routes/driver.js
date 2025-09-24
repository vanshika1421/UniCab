

const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const { requireLogin, requireRole } = require('../middleware/auth');


router.get('/add', requireLogin, requireRole('driver'), (req, res) => {
  res.render('add');
});

router.post('/add', requireLogin, requireRole('driver'), rideController.addRide);


router.get('/driver/notifications', requireLogin, requireRole('driver'), rideController.getDriverNotifications);
// Cancel a ride (driver)
router.post('/cancel-ride/:rideId', requireLogin, requireRole('driver'), rideController.cancelRide);

module.exports = router;
