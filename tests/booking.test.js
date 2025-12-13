const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Booking = require('../models/Booking');
const Ride = require('../models/Ride');
const User = require('../models/User');
const bookingController = require('../controllers/bookingController');

let mongoServer;

// Helper to mock express req/res
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
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Booking.deleteMany({});
  await Ride.deleteMany({});
  await User.deleteMany({});
});

test('rejects booking a ride that is in the past', async () => {
  const user = await User.create({ username: 'rider1', password: 'pass123', role: 'rider' });
  const past = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
  const ride = await Ride.create({ from: 'A', to: 'B', time: past, seats: 3, price: 100, driver: user._id, driverName: 'D', contact: '123' });

  const { req, res } = mockReqRes({ params: { rideId: ride._id.toString() }, body: { seats: 1 }, user: { id: user._id.toString() } });
  await bookingController.bookRide(req, res);

  expect(res._status).toBe(400);
  expect(res._sent).toBe('Cannot book a ride in the past');
});

test('allows booking a ride in the future and decrements seats', async () => {
  const rider = await User.create({ username: 'rider2', password: 'pass123', role: 'rider' });
  const driver = await User.create({ username: 'driver1', password: 'pass123', role: 'driver' });
  const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour in future
  const ride = await Ride.create({ from: 'A', to: 'B', time: future, seats: 3, price: 100, driver: driver._id, driverName: 'D', contact: '123' });

  const { req, res } = mockReqRes({ params: { rideId: ride._id.toString() }, body: { seats: 2 }, user: { id: rider._id.toString() } });
  await bookingController.bookRide(req, res);

  // reload ride and check seats
  const updatedRide = await Ride.findById(ride._id);
  const bookings = await Booking.find({ ride: ride._id });

  expect(res._redirect).toBe('/mybookings');
  expect(updatedRide.seats).toBe(1); // 3 - 2 = 1
  expect(bookings.length).toBe(1);
  expect(bookings[0].seats).toBe(2);
});
