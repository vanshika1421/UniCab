require('dotenv').config();
const { notificationQueue } = require('../queues/notificationQueue');
const { pub } = require('../lib/redisClient');

// Process notification jobs
notificationQueue.process(async (job) => {
  const { type, payload } = job.data;
  console.log('Processing notification job:', type, payload);

  // Example: pretend to send an email/push; here we just log
  // In real world you would call an email/SMS service here
  await new Promise((r) => setTimeout(r, 500));

  // Publish a 'notification.sent' message to Redis
  try {
    await pub.publish('notification.sent', JSON.stringify({ type, payload, sentAt: new Date().toISOString() }));
  } catch (err) {
    console.warn('Failed to publish notification.sent', err.message);
  }

  return { ok: true };
});

notificationQueue.on('completed', (job, result) => {
  console.log('Notification job completed', job.id);
});

notificationQueue.on('failed', (job, err) => {
  console.error('Notification job failed', job.id, err.message);
});

console.log('Notification worker started and listening for jobs');
