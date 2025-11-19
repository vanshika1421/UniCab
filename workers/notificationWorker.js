require('dotenv').config();
const { notificationQueue } = require('../queues/notificationQueue');
const { pub } = require('../lib/redisClient');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Configure SMTP transporter from environment variables
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.FROM_EMAIL || smtpUser;

let transporter = null;
if (smtpHost && smtpPort && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
  transporter.verify().then(() => console.log('SMTP transporter ready')).catch(err => console.warn('SMTP verify failed', err && err.message ? err.message : err));
} else {
  console.warn('SMTP not configured - email notifications will be skipped. Set SMTP_HOST/PORT/USER/PASS in env.');
}

// Process notification jobs
notificationQueue.process(async (job) => {
  const { type, payload } = job.data;
  console.log('Processing notification job:', type, payload);

  try {
    if (type === 'booking.created') {
      // payload: { bookingId, rideId, riderId }
      const { bookingId, rideId, riderId } = payload || {};
      // fetch booking/ride/driver/rider details
      const booking = bookingId ? await Booking.findById(bookingId) : null;
      const ride = rideId ? await Ride.findById(rideId) : null;
      const driver = ride ? await User.findById(ride.driver) : null;
      const rider = riderId ? await User.findById(riderId) : null;

      const driverEmail = driver && driver.email ? driver.email : (ride && ride.contact ? ride.contact : null);

      if (driverEmail && transporter) {
        const subject = `Your ride was booked — booking ${bookingId}`;
        const textLines = [];
        textLines.push(`Hello ${driver && driver.name ? driver.name : 'Driver'},`);
        textLines.push('');
        textLines.push(`A passenger has just booked your ride from ${ride ? ride.from : 'unknown'} to ${ride ? ride.to : 'unknown'}.`);
        if (rider && (rider.name || rider.email)) {
          textLines.push(`Passenger: ${rider.name || ''} ${rider.email ? `<${rider.email}>` : ''}`);
        }
        textLines.push('');
        textLines.push(`Booking ID: ${bookingId}`);
        textLines.push('');
        textLines.push('Thank you — UniCab');

        const mailOptions = {
          from: fromEmail,
          to: driverEmail,
          subject,
          text: textLines.join('\n')
        };

        try {
          const info = await transporter.sendMail(mailOptions);
          console.log('Email sent to driver:', driverEmail, 'info:', info && info.messageId ? info.messageId : info);
        } catch (err) {
          console.error('Failed to send email notification', err && err.message ? err.message : err);
        }
      } else {
        if (!driverEmail) console.warn('No driver email found for booking notification', bookingId, rideId);
      }
    } else {
      // For other notification types we just simulate processing
      await new Promise((r) => setTimeout(r, 500));
    }

    // Publish a 'notification.sent' message to Redis
    try {
      await pub.publish('notification.sent', JSON.stringify({ type, payload, sentAt: new Date().toISOString() }));
    } catch (err) {
      console.warn('Failed to publish notification.sent', err.message);
    }

    return { ok: true };
  } catch (err) {
    console.error('Error processing notification job:', err && err.message ? err.message : err);
    throw err;
  }
});

notificationQueue.on('completed', (job, result) => {
  console.log('Notification job completed', job.id);
});

notificationQueue.on('failed', (job, err) => {
  console.error('Notification job failed', job.id, err.message);
});

console.log('Notification worker started and listening for jobs');
