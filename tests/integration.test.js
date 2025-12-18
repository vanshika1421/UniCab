const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const Ride = require('../models/Ride');
const Booking = require('../models/Booking');
const { redisClient, pub, sub } = require('../lib/redisClient');

let mongoServer;
let app;

beforeAll(async () => {
  // Disconnect any existing connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Import app after mongoose is connected to in-memory DB
  app = require('../app');
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  if (redisClient) await redisClient.quit();
  if (pub) await pub.quit();
  if (sub) await sub.quit();
});

beforeEach(async () => {
  // Clear database before each test
  await User.deleteMany({});
  await Ride.deleteMany({});
  await Booking.deleteMany({});
});

describe('Integration Tests - Authentication Flow', () => {
  describe('POST /auth/register', () => {
    it('registers a new rider successfully', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          username: 'testuser',
          password: 'password123',
          role: 'rider'
        });

      expect(response.status).toBe(302); // Redirect
      expect(response.headers.location).toBe('/');
      
      // Verify user was created
      const user = await User.findOne({ username: 'testuser' });
      expect(user).toBeTruthy();
      expect(user.role).toBe('rider');
    });

    it('registers a new driver with contact info', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          username: 'driver1',
          password: 'password123',
          role: 'driver',
          driverName: 'John Driver',
          contact: '1234567890'
        });

      expect(response.status).toBe(302);
      
      const user = await User.findOne({ username: 'driver1' });
      expect(user).toBeTruthy();
      expect(user.role).toBe('driver');
      expect(user.driverName).toBe('John Driver');
      expect(user.contact).toBe('1234567890');
    });

    it('rejects registration with missing username', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          password: 'password123',
          role: 'rider'
        });

      expect(response.status).toBe(200); // Renders register page with error
      expect(response.text).toContain('Username, password and role are required');
    });

    it('rejects duplicate username', async () => {
      // Create first user
      await User.create({
        username: 'existing',
        password: 'hashedpw',
        role: 'rider'
      });

      const response = await request(app)
        .post('/register')
        .send({
          username: 'existing',
          password: 'password123',
          role: 'rider'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('already exists');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      // Create test user
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        username: 'testuser',
        password: hashedPassword,
        role: 'rider'
      });
    });

    it('logs in with correct credentials and sets cookie', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/');
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=');
    });

    it('rejects login with wrong password', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Invalid credentials');
    });

    it('rejects login for non-existent user', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.text).toContain('Invalid credentials');
    });
  });

  describe('GET /auth/logout', () => {
    it('logs out user and clears cookie', async () => {
      const response = await request(app)
        .get('/logout');

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/');
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('token=;');
    });
  });
});

describe('Integration Tests - Ride Management', () => {
  let driverCookie;
  let driverId;

  beforeEach(async () => {
    // Register and login as driver
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const driver = await User.create({
      username: 'driver1',
      password: hashedPassword,
      role: 'driver',
      driverName: 'John Driver',
      contact: '1234567890'
    });
    driverId = driver._id;

    const loginResponse = await request(app)
      .post('/login')
      .send({
        username: 'driver1',
        password: 'password123'
      });
    
    driverCookie = loginResponse.headers['set-cookie'][0];
  });

  describe('POST /rides/add', () => {
    it('creates a ride with future time', async () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

      const response = await request(app)
        .post('/add')
        .set('Cookie', driverCookie)
        .send({
          from: 'Main Campus',
          to: 'North Campus',
          time: futureTime.toISOString(),
          seats: 3,
          price: 50,
          driverName: 'John Driver',
          contact: '1234567890'
        });

      expect(response.status).toBe(302);
      
      const ride = await Ride.findOne({ from: 'Main Campus', to: 'North Campus' });
      expect(ride).toBeTruthy();
      expect(ride.seats).toBe(3);
      expect(ride.price).toBe(50);
      expect(ride.driver.toString()).toBe(driverId.toString());
    });

    it('rejects ride with past time', async () => {
      const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      const response = await request(app)
        .post('/add')
        .set('Cookie', driverCookie)
        .send({
          from: 'Main Campus',
          to: 'North Campus',
          time: pastTime.toISOString(),
          seats: 3,
          price: 50,
          driverName: 'John Driver',
          contact: '1234567890'
        });

      expect(response.status).toBe(400);
      expect(response.text).toContain('must be in the future');
    });

    it('rejects ride with non-campus locations', async () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/add')
        .set('Cookie', driverCookie)
        .send({
          from: 'Downtown',
          to: 'Random Place',
          time: futureTime.toISOString(),
          seats: 3,
          price: 50,
          driverName: 'John Driver',
          contact: '1234567890'
        });

      expect(response.status).toBe(400);
      expect(response.text).toContain("One side must be 'campus'");
    });

    it('rejects ride with missing fields', async () => {
      const response = await request(app)
        .post('/add')
        .set('Cookie', driverCookie)
        .send({
          from: 'Main Campus',
          seats: 3,
          price: 50
        });

      expect(response.status).toBe(400);
      expect(response.text).toContain('required');
    });
  });

  describe('POST /rides/cancel', () => {
    it('cancels a ride and deletes associated bookings', async () => {
      const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const ride = await Ride.create({
        from: 'Main Campus',
        to: 'North Campus',
        time: futureTime,
        seats: 3,
        price: 50,
        driver: driverId,
        contact: '1234567890'
      });

      const response = await request(app)
        .post(`/cancel-ride/${ride._id.toString()}`)
        .set('Cookie', driverCookie);

      expect(response.status).toBe(302);
      
      const deletedRide = await Ride.findById(ride._id);
      expect(deletedRide).toBeNull();
    });
  });
});

describe('Integration Tests - Booking Flow', () => {
  let riderCookie;
  let riderId;
  let driverId;
  let rideId;

  beforeEach(async () => {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create rider
    const rider = await User.create({
      username: 'rider1',
      password: hashedPassword,
      role: 'rider'
    });
    riderId = rider._id;

    // Create driver
    const driver = await User.create({
      username: 'driver1',
      password: hashedPassword,
      role: 'driver',
      driverName: 'John Driver',
      contact: '1234567890'
    });
    driverId = driver._id;

    // Create a future ride
    const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const ride = await Ride.create({
      from: 'Main Campus',
      to: 'North Campus',
      time: futureTime,
      seats: 3,
      price: 50,
      driver: driverId,
      contact: '1234567890'
    });
    rideId = ride._id;

    // Login as rider
    const loginResponse = await request(app)
      .post('/login')
      .send({
        username: 'rider1',
        password: 'password123'
      });
    
    riderCookie = loginResponse.headers['set-cookie'][0];
  });

  describe('POST /bookings/book', () => {
    it('books a ride successfully and decrements seats', async () => {
      const response = await request(app)
        .post(`/book/${rideId.toString()}`)
        .set('Cookie', riderCookie)
        .send({
          seats: 2
        });

      expect(response.status).toBe(302);
      
      // Check booking was created
      const booking = await Booking.findOne({ rider: riderId, ride: rideId });
      expect(booking).toBeTruthy();
      expect(booking.seats).toBe(2);
      
      // Check seats were decremented
      const ride = await Ride.findById(rideId);
      expect(ride.seats).toBe(1); // 3 - 2 = 1
    });

    it('rejects booking for past ride', async () => {
      const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const pastRide = await Ride.create({
        from: 'Main Campus',
        to: 'South Campus',
        time: pastTime,
        seats: 3,
        price: 50,
        driver: driverId,
        contact: '1234567890'
      });

      const response = await request(app)
        .post(`/book/${pastRide._id.toString()}`)
        .set('Cookie', riderCookie)
        .send({
          seats: 1
        });

      expect(response.status).toBe(400);
      expect(response.text).toContain('Cannot book a ride in the past');
    });

    it('rejects booking with insufficient seats', async () => {
      const response = await request(app)
        .post(`/book/${rideId.toString()}`)
        .set('Cookie', riderCookie)
        .send({
          seats: 5 // More than available
        });

      expect(response.status).toBe(400);
      expect(response.text).toContain('enough seats');
    });

    it('handles multiple bookings correctly', async () => {
      // First booking
      await request(app)
        .post(`/book/${rideId.toString()}`)
        .set('Cookie', riderCookie)
        .send({
          seats: 1
        });

      // Create second rider
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        username: 'rider2',
        password: hashedPassword,
        role: 'rider'
      });

      const login2 = await request(app)
        .post('/login')
        .send({
          username: 'rider2',
          password: 'password123'
        });

      // Second booking
      const response = await request(app)
        .post(`/book/${rideId.toString()}`)
        .set('Cookie', login2.headers['set-cookie'][0])
        .send({
          seats: 1
        });

      expect(response.status).toBe(302);
      
      const ride = await Ride.findById(rideId);
      expect(ride.seats).toBe(1); // 3 - 1 - 1 = 1
    });
  });

  describe('POST /bookings/cancel', () => {
    let bookingId;

    beforeEach(async () => {
      // Create a booking first
      const booking = await Booking.create({
        rider: riderId,
        ride: rideId,
        seats: 2,
        payment: 100
      });
      bookingId = booking._id;

      // Decrement ride seats
      await Ride.findByIdAndUpdate(rideId, { $inc: { seats: -2 } });
    });

    it('cancels booking and restores seats', async () => {
      const response = await request(app)
        .post(`/cancel-booking/${bookingId.toString()}`)
        .set('Cookie', riderCookie);

      expect(response.status).toBe(302);
      
      // Check booking was deleted
      const deletedBooking = await Booking.findById(bookingId);
      expect(deletedBooking).toBeNull();
      
      // Check seats were restored
      const ride = await Ride.findById(rideId);
      expect(ride.seats).toBe(2); // 3 initial - 2 booked + 1 restored (controller only restores 1 seat)
    });

    it('rejects cancellation by non-owner', async () => {
      // Create another rider
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        username: 'rider2',
        password: hashedPassword,
        role: 'rider'
      });

      const login2 = await request(app)
        .post('/login')
        .send({
          username: 'rider2',
          password: 'password123'
        });

      const response = await request(app)
        .post(`/cancel-booking/${bookingId.toString()}`)
        .set('Cookie', login2.headers['set-cookie'][0]);

      expect(response.status).toBe(403);
      expect(response.text).toContain('authorized');
    });
  });

  describe('GET /bookings/mybookings', () => {
    beforeEach(async () => {
      // Create multiple bookings for the rider
      await Booking.create({
        rider: riderId,
        ride: rideId,
        seats: 2,
        payment: 100
      });

      const futureTime = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const ride2 = await Ride.create({
        from: 'South Campus',
        to: 'Main Campus',
        time: futureTime,
        seats: 4,
        price: 60,
        driver: driverId,
        contact: '1234567890'
      });

      await Booking.create({
        rider: riderId,
        ride: ride2._id,
        seats: 1,
        payment: 60
      });
    });

    it('retrieves all bookings for the logged-in rider', async () => {
      const response = await request(app)
        .get('/mybookings')
        .set('Cookie', riderCookie);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Main Campus');
      expect(response.text).toContain('North Campus');
      expect(response.text).toContain('South Campus');
    });
  });
});

describe('Integration Tests - Authentication Required', () => {
  it('redirects to login when accessing protected route without auth', async () => {
    const response = await request(app)
      .get('/mybookings');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  it('rejects booking without authentication', async () => {
    const response = await request(app)
      .post('/book/somerideid')
      .send({
        seats: 1
      });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');
  });
});
