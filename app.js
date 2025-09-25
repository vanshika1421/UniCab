
const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/unicab')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to get current user from cookie
app.use((req, res, next) => {
  res.locals.user = req.cookies.user || null;
  res.locals.role = req.cookies.role || null;
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ride app running on port ${PORT}`));
