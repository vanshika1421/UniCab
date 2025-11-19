module.exports = {
  // Server Configuration
  port: parseInt(process.env.PORT) || 5000,

  // JWT Configuration
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_key_for_development',

  // Database Configuration
  mongoURI: process.env.MONGO_URI || 'mongodb://mongo:27017/unicab',
};
