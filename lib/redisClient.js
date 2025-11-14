const Redis = require('ioredis');

// Use REDIS_URL if provided, otherwise localhost
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const client = new Redis(redisUrl);
const pub = client.duplicate();
const sub = client.duplicate();

// Simple cache helpers (string values)
async function cacheGet(key) {
  try {
    const v = await client.get(key);
    return v ? JSON.parse(v) : null;
  } catch (err) {
    console.warn('Redis GET error:', err.message);
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 60) {
  try {
    const val = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await client.set(key, val, 'EX', ttlSeconds);
    } else {
      await client.set(key, val);
    }
  } catch (err) {
    console.warn('Redis SET error:', err.message);
  }
}

async function cacheDel(key) {
  try {
    await client.del(key);
  } catch (err) {
    console.warn('Redis DEL error:', err.message);
  }
}

module.exports = {
  client,
  pub,
  sub,
  cacheGet,
  cacheSet,
  cacheDel,
};
