const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const bookingController = require('../controllers/bookingController');

let mongoServer;

function mockReqRes({ params = {}, body = {}, user = {} } = {}) {
  const req = { params, body, user };
  let status = 200;
  const res = {
    status(code) { status = code; return this; },
    send(payload) { this._sent = payload; this._status = status; },
    redirect(path) { this._redirect = path; this._status = 302; }
  };
  return { req, res };
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  const { client, pub, sub } = require('../lib/redisClient');
  await client.quit();
  await pub.quit();
  await sub.quit();
});

afterEach(async () => {
  await Booking.deleteMany({});
  await Ride.deleteMany({});
  await User.deleteMany({});
});

test('cancels booking and restores seats', async () => {
  const rider = await User.create({ username: 'rider1', password: 'pass123', role: 'rider' });
  const driver = await User.create({ username: 'driver1', password: 'pass123', role: 'driver' });
  const future = new Date(Date.now() + 3600000);
  const ride = await Ride.create({
    from: 'Campus',
    to: 'Airport',
    time: future,
    seats: 2, // 2 seats currently available
    price: 100,
    driver: driver._id,
    driverName: 'D',
    contact: '123'
  });

  const booking = await Booking.create({
    rider: rider._id,
    ride: ride._id,
    seats: 1 // rider booked 1 seat
  });

  const { req, res } = mockReqRes({
    params: { bookingId: booking._id.toString() },
    user: { id: rider._id.toString() }
  });

  await bookingController.cancelBooking(req, res);

  expect(res._redirect).toBe('/mybookings');
  
  // Booking should be deleted
  const bookings = await Booking.find({});
  expect(bookings.length).toBe(0);

  // Seats should be restored (2 + 1 = 3)
  const updatedRide = await Ride.findById(ride._id);
  expect(updatedRide.seats).toBe(3);
});

test('rejects cancellation by non-owner', async () => {
  const rider1 = await User.create({ username: 'rider1', password: 'pass123', role: 'rider' });
  const rider2 = await User.create({ username: 'rider2', password: 'pass123', role: 'rider' });
  const driver = await User.create({ username: 'driver1', password: 'pass123', role: 'driver' });
  const future = new Date(Date.now() + 3600000);
  const ride = await Ride.create({
    from: 'Campus',
    to: 'Airport',
    time: future,
    seats: 3,
    price: 100,
    driver: driver._id,
    driverName: 'D',
    contact: '123'
  });

  const booking = await Booking.create({
    rider: rider1._id,
    ride: ride._id,
    seats: 1
  });

  // rider2 tries to cancel rider1's booking
  const { req, res } = mockReqRes({
    params: { bookingId: booking._id.toString() },
    user: { id: rider2._id.toString() }
  });

  await bookingController.cancelBooking(req, res);

  expect(res._status).toBe(403);
  expect(res._sent).toContain('Unauthorized');
  
  // Booking should still exist
  const bookings = await Booking.find({});
  expect(bookings.length).toBe(1);
});

test('rejects booking when not enough seats', async () => {
  const rider = await User.create({ username: 'rider1', password: 'pass123', role: 'rider' });
  const driver = await User.create({ username: 'driver1', password: 'pass123', role: 'driver' });
  const future = new Date(Date.now() + 3600000);
  const ride = await Ride.create({
    from: 'Campus',
    to: 'Airport',
    time: future,
    seats: 1, // only 1 seat
    price: 100,
    driver: driver._id,
    driverName: 'D',
    contact: '123'
  });

  const { req, res } = mockReqRes({
    params: { rideId: ride._id.toString() },
    body: { seats: 2 }, // requesting 2 seats
    user: { id: rider._id.toString() }
  });

  await bookingController.bookRide(req, res);

  expect(res._status).toBe(400);
  expect(res._sent).toBe('Not enough seats available');
  
  // No booking should be created
  const bookings = await Booking.find({});
  expect(bookings.length).toBe(0);
  
  // Seats should remain unchanged
  const unchangedRide = await Ride.findById(ride._id);
  expect(unchangedRide.seats).toBe(1);
});

test('creates multiple bookings correctly', async () => {
  const rider1 = await User.create({ username: 'rider1', password: 'pass123', role: 'rider' });
  const rider2 = await User.create({ username: 'rider2', password: 'pass123', role: 'rider' });
  const driver = await User.create({ username: 'driver1', password: 'pass123', role: 'driver' });
  const future = new Date(Date.now() + 3600000);
  const ride = await Ride.create({
    from: 'Campus',
    to: 'Airport',
    time: future,
    seats: 5,
    price: 100,
    driver: driver._id,
    driverName: 'D',
    contact: '123'
  });

  // First rider books 2 seats
  const { req: req1, res: res1 } = mockReqRes({
    params: { rideId: ride._id.toString() },
    body: { seats: 2 },
    user: { id: rider1._id.toString() }
  });
  await bookingController.bookRide(req1, res1);

  // Second rider books 1 seat
  const { req: req2, res: res2 } = mockReqRes({
    params: { rideId: ride._id.toString() },
    body: { seats: 1 },
    user: { id: rider2._id.toString() }
  });
  await bookingController.bookRide(req2, res2);

  const bookings = await Booking.find({});
  expect(bookings.length).toBe(2);
  
  const updatedRide = await Ride.findById(ride._id);
  expect(updatedRide.seats).toBe(2); // 5 - 2 - 1 = 2
});
