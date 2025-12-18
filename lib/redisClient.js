// In tests, use an in-memory Redis mock to avoid external dependency
const isTest = process.env.NODE_ENV === 'test';
const Redis = isTest ? require('ioredis-mock') : require('ioredis');

// Use REDIS_URL if provided, otherwise localhost
let redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// If the configured host is the Docker service name `redis` but the process
// appears to be running on a developer's host (e.g. Windows), automatically
// fallback to localhost so the app can connect to the port mapped by Docker.
try {
  const parsed = new URL(redisUrl);
  if (parsed.hostname === 'redis' && process.platform === 'win32') {
    console.warn('[redis] Hostname "redis" detected while running on Windows host — falling back to 127.0.0.1 for local dev.');
    redisUrl = 'redis://127.0.0.1:6379';
  }
} catch (e) {
  // Ignore URL parse errors and use the raw value
}

// Configure ioredis with a more tolerant retry strategy to avoid
// throwing MaxRetriesPerRequestError during transient DNS/network failures.
const redisOptions = {
  // Allow multiple retries per request before failing; small number is sufficient for dev
  maxRetriesPerRequest: 20,
  // Reconnect strategy: exponential backoff up to 2s
  retryStrategy: (times) => Math.min(times * 50, 2000),
  // Connection timeout in ms
  connectTimeout: 10000,
};

const client = new Redis(redisUrl, redisOptions);
const pub = client.duplicate();
const sub = client.duplicate();

// Attach error handlers to avoid uncaught exceptions when Redis is unreachable
function attachRedisHandlers(r) {
  if (!r || typeof r.on !== 'function') return;
  r.on('error', (err) => {
    try {
      const msg = err && err.message ? err.message : String(err);
      console.error('[redis] error event:', msg);

      // Helpful diagnostic when hostname `redis` cannot be resolved by a host process
      if (msg.includes('ENOTFOUND') && /\bredis\b/.test(msg)) {
        console.warn('[redis] Hint: hostname "redis" is resolvable only from inside Docker Compose containers.');
        console.warn('[redis] If you run the Node process on your host (not in Docker), set `REDIS_URL=redis://127.0.0.1:6379` or run the service inside Docker.');
      }
    } catch (e) {
      // swallow
    }
  });
  r.on('connect', () => console.log('[redis] connect'));
  r.on('ready', () => console.log('[redis] ready'));
  r.on('end', () => console.warn('[redis] connection closed'));
}

attachRedisHandlers(client);
attachRedisHandlers(pub);
attachRedisHandlers(sub);

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
