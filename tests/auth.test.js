const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const userController = require('../controllers/userController');

let mongoServer;

function mockReqRes({ body = {}, cookies = {} } = {}) {
  const req = { body, cookies };
  let status = 200;
  const res = {
    status(code) { status = code; return this; },
    send(payload) { this._sent = payload; this._status = status; },
    redirect(path) { this._redirect = path; this._status = 302; },
    cookie(name, value, opts) { this._cookie = { name, value, opts }; },
    clearCookie(name) { this._clearedCookie = name; },
    render(view, data) { this._rendered = { view, data }; this._status = status; }
  };
  return { req, res };
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  process.env.JWT_SECRET = 'test-secret';
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
  await User.deleteMany({});
});

test('registers a new user successfully', async () => {
  const { req, res } = mockReqRes({
    body: {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'rider'
    }
  });

  await userController.register(req, res);

  expect(res._redirect).toBe('/');
  const users = await User.find({});
  expect(users.length).toBe(1);
  expect(users[0].username).toBe('testuser');
  expect(users[0].role).toBe('rider');
});

test('rejects registration with missing fields', async () => {
  const { req, res} = mockReqRes({
    body: { username: 'testuser' } // missing password and role
  });

  await userController.register(req, res);

  // Controller renders error page when fields missing
  expect(res._rendered).toBeDefined();
  expect(res._rendered.view).toBe('register');
});

test('rejects duplicate username', async () => {
  await User.create({
    username: 'existing',
    password: await bcrypt.hash('pass123', 10),
    role: 'rider'
  });

  const { req, res } = mockReqRes({
    body: {
      username: 'existing',
      password: 'newpass',
      role: 'driver'
    }
  });

  await userController.register(req, res);

  expect(res._rendered).toBeDefined();
  expect(res._rendered.view).toBe('register');
});

test('logs in user with correct credentials', async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);
  await User.create({
    username: 'loginuser',
    password: hashedPassword,
    role: 'rider'
  });

  const { req, res } = mockReqRes({
    body: {
      username: 'loginuser',
      password: 'password123'
    }
  });

  await userController.login(req, res);

  expect(res._redirect).toBe('/');
  expect(res._cookie).toBeDefined();
  expect(res._cookie.name).toBe('token');
  
  // Verify JWT token (use same secret as controller)
  const config = require('../config/default');
  const decoded = jwt.verify(res._cookie.value, config.jwtSecret);
  expect(decoded.user.username).toBe('loginuser');
  expect(decoded.user.role).toBe('rider');
});

test('rejects login with wrong password', async () => {
  const hashedPassword = await bcrypt.hash('correctpass', 10);
  await User.create({
    username: 'testuser',
    password: hashedPassword,
    role: 'rider'
  });

  const { req, res } = mockReqRes({
    body: {
      username: 'testuser',
      password: 'wrongpass'
    }
  });

  await userController.login(req, res);

  expect(res._rendered).toBeDefined();
  expect(res._rendered.view).toBe('login');
});

test('rejects login for non-existent user', async () => {
  const { req, res } = mockReqRes({
    body: {
      username: 'nonexistent',
      password: 'password123'
    }
  });

  await userController.login(req, res);

  expect(res._rendered).toBeDefined();
  expect(res._rendered.view).toBe('login');
});

test('logs out user and clears token', async () => {
  const { req, res } = mockReqRes({});

  await userController.logout(req, res);

  expect(res._redirect).toBe('/');
  expect(res._clearedCookie).toBe('token');
});
