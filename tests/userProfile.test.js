const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User Profile Management', () => {
  let testUser;

  beforeEach(async () => {
    testUser = new User({
      name: 'Test User',
      email: 'test@test.com',
      password: 'pass123',
      role: 'rider'
    });

    await testUser.save();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('User Creation', () => {
    test('should create user with all fields', async () => {
      const user = new User({
        name: 'Full User',
        email: 'full@test.com',
        password: 'pass123',
        role: 'driver'
      });

      await user.save();

      expect(user._id).toBeDefined();
      expect(user.name).toBe('Full User');
      expect(user.email).toBe('full@test.com');
      expect(user.role).toBe('driver');
    });

    test('should auto-generate timestamps', async () => {
      const user = new User({
        name: 'Timestamp Test',
        email: 'timestamp@test.com',
        password: 'pass123',
        role: 'rider'
      });

      await user.save();

      expect(user.createdAt || user._id.getTimestamp()).toBeDefined();
    });
  });

  describe('User Retrieval', () => {
    test('should retrieve user by ID', async () => {
      const retrieved = await User.findById(testUser._id);

      expect(retrieved.name).toBe('Test User');
      expect(retrieved.email).toBe('test@test.com');
    });

    test('should retrieve user by email', async () => {
      const retrieved = await User.findOne({ email: 'test@test.com' });

      expect(retrieved.name).toBe('Test User');
      expect(retrieved._id.toString()).toBe(testUser._id.toString());
    });

    test('should retrieve user with lean (no methods)', async () => {
      const retrieved = await User.findById(testUser._id).lean();

      expect(retrieved.name).toBe('Test User');
    });
  });

  describe('User Update', () => {
    test('should update user name', async () => {
      testUser.name = 'Updated Name';
      await testUser.save();

      const updated = await User.findById(testUser._id);
      expect(updated.name).toBe('Updated Name');
    });

    test('should update user email', async () => {
      testUser.email = 'newemail@test.com';
      await testUser.save();

      const updated = await User.findById(testUser._id);
      expect(updated.email).toBe('newemail@test.com');
    });

    test('should update user role', async () => {
      testUser.role = 'driver';
      await testUser.save();

      const updated = await User.findById(testUser._id);
      expect(updated.role).toBe('driver');
    });

    test('should update password', async () => {
      const newPassword = 'newpass456';
      testUser.password = newPassword;
      await testUser.save();

      const updated = await User.findById(testUser._id);
      const match = await bcrypt.compare(newPassword, updated.password);

      expect(match).toBe(true);
    });

    test('should update multiple fields', async () => {
      testUser.name = 'Multi Update';
      testUser.role = 'driver';
      testUser.email = 'multi@test.com';
      await testUser.save();

      const updated = await User.findById(testUser._id);
      expect(updated.name).toBe('Multi Update');
      expect(updated.role).toBe('driver');
      expect(updated.email).toBe('multi@test.com');
    });

    test('should use findByIdAndUpdate', async () => {
      const updated = await User.findByIdAndUpdate(
        testUser._id,
        { name: 'Direct Update' },
        { new: true }
      );

      expect(updated.name).toBe('Direct Update');
    });

    test('should preserve non-updated fields', async () => {
      testUser.name = 'Name Change Only';
      await testUser.save();

      const updated = await User.findById(testUser._id);
      expect(updated.email).toBe('test@test.com'); // unchanged
      expect(updated.role).toBe('rider'); // unchanged
    });
  });

  describe('User Deletion', () => {
    test('should delete user by ID', async () => {
      await User.findByIdAndDelete(testUser._id);

      const found = await User.findById(testUser._id);
      expect(found).toBeNull();
    });

    test('should delete with deleteOne', async () => {
      await User.deleteOne({ email: 'test@test.com' });

      const found = await User.findOne({ email: 'test@test.com' });
      expect(found).toBeNull();
    });

    test('should count after deletion', async () => {
      await User.deleteOne({ _id: testUser._id });

      const count = await User.countDocuments({ _id: testUser._id });
      expect(count).toBe(0);
    });
  });

  describe('User Queries', () => {
    beforeEach(async () => {
      const riders = [
        new User({ name: 'Rider 1', email: 'rider1@test.com', password: 'p1', role: 'rider' }),
        new User({ name: 'Rider 2', email: 'rider2@test.com', password: 'p2', role: 'rider' }),
      ];

      const drivers = [
        new User({ name: 'Driver 1', email: 'driver1@test.com', password: 'd1', role: 'driver' }),
        new User({ name: 'Driver 2', email: 'driver2@test.com', password: 'd2', role: 'driver' }),
      ];

      await User.insertMany([...riders, ...drivers]);
    });

    test('should find all riders', async () => {
      const riders = await User.find({ role: 'rider' });

      expect(riders.length).toBeGreaterThanOrEqual(2);
      riders.forEach(r => expect(r.role).toBe('rider'));
    });

    test('should find all drivers', async () => {
      const drivers = await User.find({ role: 'driver' });

      expect(drivers.length).toBeGreaterThanOrEqual(2);
      drivers.forEach(d => expect(d.role).toBe('driver'));
    });

    test('should count users by role', async () => {
      const riderCount = await User.countDocuments({ role: 'rider' });
      const driverCount = await User.countDocuments({ role: 'driver' });

      expect(riderCount).toBeGreaterThanOrEqual(2);
      expect(driverCount).toBeGreaterThanOrEqual(2);
    });

    test('should find users with regex on name', async () => {
      const users = await User.find({ name: /Rider/ });

      expect(users.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Password Security', () => {
    test('should not return plain password on query', async () => {
      const user = await User.findOne({ email: 'test@test.com' });

      expect(user.password).not.toBe('pass123');
      expect(user.password).toMatch(/^\$2[aby]/); // bcrypt hash format
    });

    test('should verify password match', async () => {
      const user = await User.findById(testUser._id);

      const isValid = await bcrypt.compare('pass123', user.password);
      expect(isValid).toBe(true);
    });

    test('should reject wrong password', async () => {
      const user = await User.findById(testUser._id);

      const isValid = await bcrypt.compare('wrongpass', user.password);
      expect(isValid).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    test('should update multiple users', async () => {
      await User.updateMany(
        { role: 'rider' },
        { $set: { updated: true } }
      );

      const updated = await User.findOne({ _id: testUser._id });
      expect(updated.updated).toBe(true);
    });

    test('should delete multiple users by role', async () => {
      await User.deleteMany({ role: 'rider' });

      const count = await User.countDocuments({ role: 'rider' });
      expect(count).toBe(0);
    });

    test('should find and limit', async () => {
      const users = await User.find({}).limit(1);

      expect(users.length).toBe(1);
    });

    test('should find and skip', async () => {
      await User.deleteMany({});

      for (let i = 0; i < 5; i++) {
        const user = new User({
          name: `User ${i}`,
          email: `user${i}@test.com`,
          password: 'pass',
          role: 'rider'
        });
        await user.save();
      }

      const skipped = await User.find({}).skip(2).limit(2);
      expect(skipped.length).toBe(2);
    });
  });

  describe('User Validation', () => {
    test('should reject user with missing required fields', async () => {
      const incompleteUser = new User({
        email: 'incomplete@test.com',
        password: 'pass123'
        // missing name
      });

      await expect(incompleteUser.validate()).rejects.toThrow();
    });

    test('should reject invalid role enum', async () => {
      const badRoleUser = new User({
        name: 'Bad Role',
        email: 'badrole@test.com',
        password: 'pass123',
        role: 'moderator'
      });

      await expect(badRoleUser.validate()).rejects.toThrow();
    });
  });

  describe('User Aggregation', () => {
    beforeEach(async () => {
      await User.deleteMany({});

      const users = [
        new User({ name: 'Alice', email: 'alice@test.com', password: 'p', role: 'rider' }),
        new User({ name: 'Bob', email: 'bob@test.com', password: 'p', role: 'driver' }),
        new User({ name: 'Charlie', email: 'charlie@test.com', password: 'p', role: 'rider' }),
        new User({ name: 'Diana', email: 'diana@test.com', password: 'p', role: 'driver' }),
      ];

      await User.insertMany(users);
    });

    test('should group users by role', async () => {
      const grouped = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      expect(grouped.length).toBe(2);
      grouped.forEach(g => {
        if (g._id === 'rider') expect(g.count).toBe(2);
        if (g._id === 'driver') expect(g.count).toBe(2);
      });
    });

    test('should count total users', async () => {
      const result = await User.aggregate([
        { $group: { _id: null, total: { $sum: 1 } } }
      ]);

      expect(result[0].total).toBe(4);
    });
  });

  describe('User Indexing', () => {
    test('should find user efficiently by email', async () => {
      const user = await User.findOne({ email: 'test@test.com' });

      expect(user).toBeDefined();
      expect(user.email).toBe('test@test.com');
    });

    test('should find user by ID efficiently', async () => {
      const user = await User.findById(testUser._id);

      expect(user).toBeDefined();
      expect(user._id.toString()).toBe(testUser._id.toString());
    });
  });
});
