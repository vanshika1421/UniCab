const express = require('express');
const router = express.Router();
const { client } = require('../lib/redisClient');

// Simple notifications view: fetch last N notifications for the user from Redis list
router.get('/notifications', async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.redirect('/login');
    const key = `notifications:user:${req.user.id}`;
    const items = await client.lrange(key, 0, 49); // last 50
    const notifications = items.map(i => JSON.parse(i));
    res.render('notifications', { notifications });
  } catch (err) {
    console.error('Error fetching notifications', err);
    res.render('notifications', { notifications: [] });
  }
});

module.exports = router;
