// ...existing code...
module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key_for_development',
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/unicab',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};
