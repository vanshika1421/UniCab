const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { client: redisClient } = require('../lib/redisClient');
const { addNotificationJob } = require('../queues/notificationQueue');

// Simple health/status endpoint for dev debugging
router.get('/debug/status', async (req, res) => {
  try {
    const mongoState = mongoose.connection && mongoose.connection.readyState;
    let redisPing = 'unknown';
    try {
      if (!redisClient) redisPing = 'no-client';
      else redisPing = await redisClient.ping();
    } catch (e) {
      redisPing = `error: ${e && e.message ? e.message : String(e)}`;
    }

    res.json({
      ok: true,
      mongo: { readyState: mongoState },
      redis: { ping: redisPing }
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err && err.message ? err.message : String(err) });
  }
});

// Dev-only: attempt to enqueue a small test notification job
router.get('/debug/enqueue', async (req, res) => {
  try {
    const type = req.query.type === 'sms' ? 'sms' : 'email';
    const sample = (type === 'sms')
      ? { type: 'sms', payload: { to: process.env.TEST_PHONE || '+10000000000', message: 'Test SMS from UniCab debug', userId: 'debug' } }
      : { type: 'email', payload: { to: process.env.TEST_EMAIL || 'test@example.com', subject: 'UniCab debug', html: '<p>Test email</p>', text: 'Test email', userId: 'debug' } };

    await addNotificationJob(sample);
    res.json({ ok: true, enqueued: true, sample });
  } catch (err) {
    res.status(500).json({ ok: false, error: err && err.message ? err.message : String(err) });
  }
});

module.exports = router;
