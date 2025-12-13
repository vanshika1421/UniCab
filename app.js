
// Load environment variables first
require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('./config/default');

// Make Mongoose fail-fast when the server cannot reach MongoDB
mongoose.set('bufferCommands', false);

// Connect to MongoDB with sensible timeouts so requests fail quickly when DB is down
mongoose.connect(config.mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // stop trying to send operations after 5s
  connectTimeoutMS: 10000
})
  .then(() => {
    console.log('Connected to MongoDB:', config.mongoURI);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err && err.stack ? err.stack : err);
  });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
// Serve static assets from /public (CSS, client JS, images)
app.use(express.static(path.join(__dirname, 'public')));
// Fail-fast middleware: if DB isn't ready, return 503 quickly to avoid long timeouts
app.use((req, res, next) => {
  // allow static assets to be served even when DB is down
  if (req.url.startsWith('/css') || req.url.startsWith('/js') || req.url.startsWith('/images') || req.url.startsWith('/public')) {
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    console.warn('DB not ready (state=' + mongoose.connection.readyState + '). Returning 503 for', req.method, req.url);
    return res.status(503).send('Service temporarily unavailable — database is initializing');
  }

  next();
});
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// JWT Authentication middleware for all routes
app.use((req, res, next) => {
  const token = req.cookies.token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      res.locals.user = decoded.user.username;
      res.locals.role = decoded.user.role;
      res.locals.userId = decoded.user.id;
      req.user = decoded.user;
    } catch (error) {
      console.error('Token verification failed:', error);
      res.clearCookie('token');
      res.locals.user = null;
      res.locals.role = null;
      res.locals.userId = null;
    }
  } else {
    res.locals.user = null;
    res.locals.role = null;
    res.locals.userId = null;
  }
  next();
});

// Models
const User = require('./models/User');
const Ride = require('./models/Ride');
const Booking = require('./models/Booking');

// Use routes
app.use('/', require('./routes/index'));
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/driver'));
app.use('/', require('./routes/rider'));
app.use('/', require('./routes/api'));
const feedbackRoutes = require('./routes/feedback');
app.use('/feedback', feedbackRoutes);


// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.stack);
  res.status(500).send('Something went wrong!');
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Process error handlers
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in development
});

const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`🚀 Ride app running on port ${PORT}`);
  console.log(`🌐 Visit: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});
