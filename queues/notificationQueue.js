const Queue = require('bull');
const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const notificationQueue = new Queue('notifications', redisUrl);

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
