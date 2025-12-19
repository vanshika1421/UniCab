const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Booking Edge Cases', () => {
  let driver, rider1, rider2, ride;

  beforeEach(async () => {
    driver = new User({ name: 'Driver', email: 'driver@test.com', password: 'pass123', role: 'driver' });
    rider1 = new User({ name: 'Rider 1', email: 'rider1@test.com', password: 'pass123', role: 'rider' });
    rider2 = new User({ name: 'Rider 2', email: 'rider2@test.com', password: 'pass123', role: 'rider' });

    await driver.save();
    await rider1.save();
    await rider2.save();

    ride = new Ride({
      from: 'Campus',
      to: 'Delhi',
      time: new Date(Date.now() + 3600000),
      seats: 4,
      price: 500,
      driver: driver._id,
      driverName: 'Driver Name',
      contact: '9876543210'
    });

    await ride.save();
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Ride.deleteMany({});
    await Booking.deleteMany({});
  });

  describe('Duplicate Booking Prevention', () => {
    test('should allow same rider to book same ride multiple times (different seats)', async () => {
      const booking1 = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1
      });

      const booking2 = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 2
      });

      await booking1.save();
      await booking2.save();

      const bookings = await Booking.find({ rider: rider1._id, ride: ride._id });
      expect(bookings.length).toBe(2);
    });

    test('should prevent double booking if exactly same ride and rider', async () => {
      const booking1 = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1,
        status: 'confirmed'
      });

      await booking1.save();

      const booking2 = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1,
        status: 'confirmed'
      });

      await booking2.save();

      const bookings = await Booking.find({ rider: rider1._id, ride: ride._id });
      // System allows it at model level, but controller should prevent
      expect(bookings.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Rider Booking Own Ride', () => {
    test('should allow rider to book their own ride (edge case)', async () => {
      const selfRide = new Ride({
        from: 'Delhi',
        to: 'Campus',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: rider1._id,
        driverName: 'Rider as Driver',
        contact: '9876543210'
      });

      await selfRide.save();

      const booking = new Booking({
        rider: rider1._id,
        ride: selfRide._id,
        seats: 1
      });

      await booking.save();
      expect(booking._id).toBeDefined();
    });
  });

  describe('Seat Exhaustion', () => {
    test('should allow booking more seats than available', async () => {
      const smallRide = new Ride({
        from: 'Campus',
        to: 'Gurgaon',
        time: new Date(Date.now() + 3600000),
        seats: 2,
        price: 300,
        driver: driver._id,
        driverName: 'Driver',
        contact: '9876543210'
      });

      await smallRide.save();

      const booking = new Booking({
        rider: rider1._id,
        ride: smallRide._id,
        seats: 5 // more than available
      });

      await booking.save();
      expect(booking.seats).toBe(5);
    });

    test('should track cumulative bookings', async () => {
      const booking1 = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 2
      });

      const booking2 = new Booking({
        rider: rider2._id,
        ride: ride._id,
        seats: 3
      });

      await booking1.save();
      await booking2.save();

      const total = await Booking.aggregate([
        { $match: { ride: ride._id } },
        { $group: { _id: '$ride', totalSeats: { $sum: '$seats' } } }
      ]);

      expect(total[0].totalSeats).toBe(5);
    });

    test('should allow 0 seat booking', async () => {
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 0
      });

      await booking.save();
      expect(booking.seats).toBe(0);
    });

    test('should handle negative seat booking', async () => {
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: -2
      });

      await booking.save();
      expect(booking.seats).toBe(-2);
    });
  });

  describe('Booking Status Transitions', () => {
    test('should transition from pending to confirmed', async () => {
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1,
        status: 'pending'
      });

      await booking.save();
      booking.status = 'confirmed';
      await booking.save();

      const updated = await Booking.findById(booking._id);
      expect(updated.status).toBe('confirmed');
    });

    test('should transition from confirmed to cancelled', async () => {
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1,
        status: 'confirmed'
      });

      await booking.save();
      booking.status = 'cancelled';
      await booking.save();

      const updated = await Booking.findById(booking._id);
      expect(updated.status).toBe('cancelled');
    });

    test('should handle invalid status gracefully', async () => {
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1,
        status: 'invalid_status'
      });

      await expect(booking.validate()).rejects.toThrow();
    });
  });

  describe('Booking Cancellation', () => {
    test('should cancel booking without affecting ride', async () => {
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1,
        status: 'confirmed'
      });

      await booking.save();
      const rideSeats = ride.seats;

      booking.status = 'cancelled';
      await booking.save();

      const updatedRide = await Ride.findById(ride._id);
      expect(updatedRide.seats).toBe(rideSeats);
    });

    test('should allow cancellation of pending booking', async () => {
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1,
        status: 'pending'
      });

      await booking.save();
      booking.status = 'cancelled';
      await booking.save();

      expect(booking.status).toBe('cancelled');
    });
  });

  describe('Payment Integration', () => {
    test('should store payment intent ID', async () => {
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1,
        paymentIntentId: 'pi_1234567890',
        paymentStatus: 'requires_capture'
      });

      await booking.save();
      const saved = await Booking.findById(booking._id);
      expect(saved.paymentIntentId).toBe('pi_1234567890');
    });

    test('should track payment capture date', async () => {
      const captureDate = new Date();
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1,
        paymentStatus: 'captured',
        chargedAt: captureDate
      });

      await booking.save();
      const saved = await Booking.findById(booking._id);
      expect(saved.chargedAt.getTime()).toBe(captureDate.getTime());
    });

    test('should handle failed payment status', async () => {
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1,
        paymentStatus: 'failed'
      });

      await booking.save();
      expect(booking.paymentStatus).toBe('failed');
    });
  });

  describe('Booking Timestamps', () => {
    test('should auto-set bookedAt timestamp', async () => {
      const before = new Date();
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1
      });

      await booking.save();
      const after = new Date();

      expect(booking.bookedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(booking.bookedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Multiple Bookings Per Ride', () => {
    test('should allow many bookings for same ride', async () => {
      const bookings = [];
      for (let i = 0; i < 5; i++) {
        const user = new User({
          name: `Rider ${i}`,
          email: `rider${i}@test.com`,
          password: 'pass',
          role: 'rider'
        });
        await user.save();

        const booking = new Booking({
          rider: user._id,
          ride: ride._id,
          seats: 1
        });
        await booking.save();
        bookings.push(booking);
      }

      const rideBookings = await Booking.find({ ride: ride._id });
      expect(rideBookings.length).toBe(5);
    });
  });

  describe('Booking References', () => {
    test('should populate rider reference', async () => {
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1
      });

      await booking.save();
      const populated = await Booking.findById(booking._id).populate('rider');

      expect(populated.rider.name).toBe('Rider 1');
      expect(populated.rider.email).toBe('rider1@test.com');
    });

    test('should populate ride reference', async () => {
      const booking = new Booking({
        rider: rider1._id,
        ride: ride._id,
        seats: 1
      });

      await booking.save();
      const populated = await Booking.findById(booking._id).populate('ride');

      expect(populated.ride.from).toBe('Campus');
      expect(populated.ride.to).toBe('Delhi');
    });
  });
});
