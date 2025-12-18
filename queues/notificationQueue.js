const Queue = require('bull');
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// In test mode, use a mocked queue to avoid connecting to real Redis
const isTest = process.env.NODE_ENV === 'test';
const notificationQueue = isTest
  ? { add: async () => ({ id: 'mock-job-id' }), on: () => {}, close: async () => {} }
  : new Queue('notifications', redisUrl);

notificationQueue.on('error', (err) => {
  console.error('[notificationQueue] error:', err && err.message ? err.message : err);
});

async function addNotificationJob(data) {
  return notificationQueue.add(data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
}

module.exports = {
  notificationQueue,
  addNotificationJob
};
