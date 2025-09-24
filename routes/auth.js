
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');


router.get('/register', (req, res) => {
  res.render('register', { error: null });
});

router.post('/register', async (req, res) => {
  const { username, password, role, driverName, contact } = req.body;
  if (!username || !password || !role) {
    return res.render('register', { error: 'All fields required' });
  }
  const existing = await User.findOne({ username });
  if (existing) {
    return res.render('register', { error: 'Username already exists' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hash, role, driverName, contact });
  await user.save();
  res.cookie('user', username, { httpOnly: true });
  res.cookie('role', role, { httpOnly: true });
  res.redirect('/');
});


router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('login', { error: 'All fields required' });
  }
  const user = await User.findOne({ username });
  if (!user) {
    return res.render('login', { error: 'Invalid credentials' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.render('login', { error: 'Invalid credentials' });
  }
  res.cookie('user', username, { httpOnly: true });
  res.cookie('role', user.role, { httpOnly: true });
  res.redirect('/');
});

router.get('/logout', (req, res) => {
  res.clearCookie('user');
  res.redirect('/');
});

module.exports = router;
