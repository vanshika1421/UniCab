const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { getAllRides, addRide } = require('./modules/ride');
const { getAllUsers, addUser, validateUser } = require('./modules/user');
const { getAllBookings, addBooking, getUserBookings } = require('./modules/booking');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to get current user from cookie
app.use((req, res, next) => {
  res.locals.user = req.cookies.user || null;
  next();
});

// Home page: list rides
app.get('/', (req, res) => {
  const rides = getAllRides();
  res.render('index', { rides });
});

// Register
app.get('/register', (req, res) => {
  res.render('register', { error: null });
});
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('register', { error: 'All fields required' });
  }
  if (!addUser(username, password)) {
    return res.render('register', { error: 'Username already exists' });
  }
  res.cookie('user', username, { httpOnly: true });
  res.redirect('/');
});

// Login
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('login', { error: 'All fields required' });
  }
  if (!validateUser(username, password)) {
    return res.render('login', { error: 'Invalid credentials' });
  }
  res.cookie('user', username, { httpOnly: true });
  res.redirect('/');
});

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('user');
  res.redirect('/');
});

// Add ride form
app.get('/add', (req, res) => {
  if (!res.locals.user) return res.redirect('/login');
  res.render('add');
});

// Handle add ride
app.post('/add', (req, res) => {
  if (!res.locals.user) return res.redirect('/login');
  const { from, to, time, seats } = req.body;
  if (!from || !to || !time || !seats) {
    return res.status(400).send('All fields required');
  }
  addRide({ from, to, time, seats: parseInt(seats, 10) });
  res.redirect('/');
});

// Book a ride
app.post('/book/:idx', (req, res) => {
  if (!res.locals.user) return res.redirect('/login');
  const rides = getAllRides();
  const idx = parseInt(req.params.idx, 10);
  if (!rides[idx] || rides[idx].seats < 1) {
    return res.status(400).send('No seats available');
  }
  // Reduce seat count
  rides[idx].seats -= 1;
  require('fs').writeFileSync(
    path.join(__dirname, 'data', 'rides.json'),
    JSON.stringify(rides, null, 2)
  );
  addBooking(res.locals.user, idx);
  res.redirect('/mybookings');
});

// User bookings
app.get('/mybookings', (req, res) => {
  if (!res.locals.user) return res.redirect('/login');
  const bookings = getUserBookings(res.locals.user);
  const rides = getAllRides();
  res.render('mybookings', { bookings, rides });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Ride app running on port ${PORT}`));
