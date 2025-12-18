const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Ride = require('../models/Ride');
const User = require('../models/User');
const rideController = require('../controllers/rideController');

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
  await Ride.deleteMany({});
  await User.deleteMany({});
});

test('rejects ride creation without all required fields', async () => {
  const driver = await User.create({ username: 'driver1', password: 'pass123', role: 'driver' });
  const { req, res } = mockReqRes({
    body: { from: 'A', to: 'B' }, // missing time, seats, price, etc
    user: { id: driver._id.toString() }
  });

  await rideController.addRide(req, res);

  expect(res._status).toBe(400);
  expect(res._sent).toBe('All fields required');
});

test('rejects ride that does not involve campus', async () => {
  const driver = await User.create({ username: 'driver1', password: 'pass123', role: 'driver' });
  const future = new Date(Date.now() + 3600000).toISOString();
  const { req, res } = mockReqRes({
    body: {
      from: 'Airport',
      to: 'Downtown',
      time: future,
      seats: 3,
      price: 50,
      driverName: 'John',
      contact: '1234567890'
    },
    user: { id: driver._id.toString() }
  });

  await rideController.addRide(req, res);

  expect(res._status).toBe(400);
  expect(res._sent).toContain('campus');
});

test('rejects ride with past time', async () => {
  const driver = await User.create({ username: 'driver1', password: 'pass123', role: 'driver' });
  const past = new Date(Date.now() - 3600000).toISOString();
  const { req, res } = mockReqRes({
    body: {
      from: 'Campus',
      to: 'Airport',
      time: past,
      seats: 3,
      price: 50,
      driverName: 'John',
      contact: '1234567890'
    },
    user: { id: driver._id.toString() }
  });

  await rideController.addRide(req, res);

  expect(res._status).toBe(400);
  expect(res._sent).toBe('Ride time must be in the future');
});

test('creates ride successfully when all validations pass', async () => {
  const driver = await User.create({ username: 'driver1', password: 'pass123', role: 'driver' });
  const future = new Date(Date.now() + 3600000).toISOString();
  const { req, res } = mockReqRes({
    body: {
      from: 'Campus',
      to: 'Airport',
      time: future,
      seats: 3,
      price: 50,
      driverName: 'John',
      contact: '1234567890'
    },
    user: { id: driver._id.toString() }
  });

  await rideController.addRide(req, res);

  expect(res._redirect).toBe('/');
  const rides = await Ride.find({});
  expect(rides.length).toBe(1);
  expect(rides[0].from).toBe('Campus');
  expect(rides[0].seats).toBe(3);
});

test('cancels ride and deletes associated bookings', async () => {
  const driver = await User.create({ username: 'driver1', password: 'pass123', role: 'driver' });
  const rider = await User.create({ username: 'rider1', password: 'pass123', role: 'rider' });
  const future = new Date(Date.now() + 3600000);
  const ride = await Ride.create({
    from: 'Campus',
    to: 'Airport',
    time: future,
    seats: 3,
    price: 50,
    driver: driver._id,
    driverName: 'John',
    contact: '1234567890'
  });

  const Booking = require('../models/Booking');
  await Booking.create({ rider: rider._id, ride: ride._id, seats: 1 });

  const { req, res } = mockReqRes({
    params: { rideId: ride._id.toString() },
    user: { id: driver._id.toString() }
  });

  await rideController.cancelRide(req, res);

  expect(res._redirect).toBe('/driver/notifications');
  const rides = await Ride.find({});
  const bookings = await Booking.find({});
  expect(rides.length).toBe(0);
  expect(bookings.length).toBe(0);
});
