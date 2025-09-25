
// Load environment variables first
require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('./config/default');

// Connect to MongoDB
mongoose.connect(config.mongoURI)
  .then(() => {
    console.log('Connected to MongoDB:', config.mongoURI);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

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

const PORT = process.env.PORT || 3000;
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
