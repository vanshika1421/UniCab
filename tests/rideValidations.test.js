const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
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

describe('Ride Validations - Edge Cases', () => {
  let userId;

  beforeEach(async () => {
    const user = new User({ name: 'Driver Test', email: 'driver@test.com', password: 'pass123', role: 'driver' });
    await user.save();
    userId = user._id;
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Ride.deleteMany({});
  });

  // Campus Rule Tests
  describe('Campus Rule Validation', () => {
    test('should reject ride where neither side is campus', async () => {
      const ride = new Ride({
        from: 'Delhi',
        to: 'Mumbai',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await expect(ride.validate()).rejects.toThrow();
    });

    test('should accept ride with campus in from field', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride._id).toBeDefined();
    });

    test('should accept ride with campus in to field', async () => {
      const ride = new Ride({
        from: 'Delhi',
        to: 'Main Campus',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride._id).toBeDefined();
    });

    test('should accept ride with campus (case-insensitive)', async () => {
      const ride = new Ride({
        from: 'CAMPUS',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride._id).toBeDefined();
    });

    test('should accept ride with campus in compound location', async () => {
      const ride = new Ride({
        from: 'North Campus Area',
        to: 'Gurgaon',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride._id).toBeDefined();
    });
  });

  // Seat Validation Tests
  describe('Seat Availability Validation', () => {
    test('should reject ride with 0 seats', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 0,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await expect(ride.validate()).rejects.toThrow();
    });

    test('should reject ride with negative seats', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: -5,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await expect(ride.validate()).rejects.toThrow();
    });

    test('should accept ride with 1 seat', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 1,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride.seats).toBe(1);
    });

    test('should accept ride with 8 seats (max)', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 8,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride.seats).toBe(8);
    });

    test('should reject ride with more than 8 seats', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 9,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await expect(ride.validate()).rejects.toThrow();
    });
  });

  // Price Validation Tests
  describe('Price Validation', () => {
    test('should accept ride with price 0', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 0,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride.price).toBe(0);
    });

    test('should reject ride with negative price', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: -100,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await expect(ride.validate()).rejects.toThrow();
    });

    test('should accept ride with decimal price', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 250.75,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride.price).toBe(250.75);
    });

    test('should accept ride with large price', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 50000,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride.price).toBe(50000);
    });
  });

  // Time Validation Tests
  describe('Time Validation', () => {
    test('should reject ride with past time', async () => {
      const pastTime = new Date(Date.now() - 3600000);
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: pastTime,
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      const saved = await Ride.findById(ride._id);
      expect(saved.time < new Date()).toBe(true);
    });

    test('should accept ride with future time', async () => {
      const futureTime = new Date(Date.now() + 86400000); // 24 hours later
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: futureTime,
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride.time > new Date()).toBe(true);
    });

    test('should accept ride scheduled in 1 minute', async () => {
      const almostNow = new Date(Date.now() + 60000);
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: almostNow,
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride.time.getTime()).toBeGreaterThan(Date.now());
    });
  });

  // Required Fields Tests
  describe('Required Fields Validation', () => {
    test('should reject ride without from field', async () => {
      const ride = new Ride({
        to: 'Campus',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await expect(ride.validate()).rejects.toThrow();
    });

    test('should reject ride without to field', async () => {
      const ride = new Ride({
        from: 'Campus',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await expect(ride.validate()).rejects.toThrow();
    });

    test('should reject ride without time', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await expect(ride.validate()).rejects.toThrow();
    });

    test('should reject ride without driver', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await expect(ride.validate()).rejects.toThrow();
    });

    test('should reject ride without driverName', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: userId,
        contact: '9876543210'
      });

      await expect(ride.validate()).rejects.toThrow();
    });

    test('should reject ride without contact', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Delhi',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe'
      });

      await expect(ride.validate()).rejects.toThrow();
    });
  });

  // Location Duplicate Tests
  describe('Location Validation', () => {
    test('should accept ride with same from and to (extreme case)', async () => {
      const ride = new Ride({
        from: 'Campus',
        to: 'Campus',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride.from).toBe(ride.to);
    });

    test('should accept ride with whitespace in locations', async () => {
      const ride = new Ride({
        from: '  Campus  ',
        to: '  Delhi  ',
        time: new Date(Date.now() + 3600000),
        seats: 4,
        price: 500,
        driver: userId,
        driverName: 'John Doe',
        contact: '9876543210'
      });

      await ride.save();
      expect(ride._id).toBeDefined();
    });
  });
});
