// ...existing code...
module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  mongoURI: process.env.MONGO_URI,
  redisUrl: process.env.REDIS_URL,
};
