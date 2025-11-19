require('dotenv').config();
const { addNotificationJob } = require('../queues/notificationQueue');

const bookingId = process.argv[2] || 'test-booking-1';
const rideId = process.argv[3] || 'test-ride-1';
const riderId = process.argv[4] || 'test-rider-1';

(async () => {
  try {
    const job = await addNotificationJob({ type: 'booking.created', payload: { bookingId, rideId, riderId } });
    console.log('Enqueued notification job', job.id);
    process.exit(0);
  } catch (err) {
    console.error('Failed to enqueue notification job', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
