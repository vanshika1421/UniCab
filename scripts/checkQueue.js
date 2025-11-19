require('dotenv').config();
const Queue = require('bull');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const notificationQueue = new Queue('notifications', redisUrl);

(async () => {
  try {
    const counts = await notificationQueue.getJobCounts();
    console.log('Notification queue counts:', counts);
    const failed = await notificationQueue.getFailed();
    if (failed.length > 0) {
      console.log('Recent failed jobs (ids):', failed.slice(0,5).map(j => j.id));
    }
    const completed = await notificationQueue.getCompleted();
    if (completed.length > 0) {
      console.log('Recent completed jobs (ids):', completed.slice(0,5).map(j => j.id));
    }
    await notificationQueue.close();
    process.exit(0);
  } catch (err) {
    console.error('Error checking queue:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
