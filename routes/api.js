const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const config = require('../config/default');

// Get current token info (for debugging)
router.get('/api/token-info', requireLogin, (req, res) => {
  const token = req.cookies.token;
  
  if (!token) {
    return res.json({
      success: false,
      error: 'No token found'
    });
  }
  
  try {
    const decoded = jwt.decode(token, { complete: true });
    res.json({
      success: true,
      tokenInfo: {
        header: decoded.header,
        payload: decoded.payload,
        rawToken: token,
        isValid: true,
        expiresAt: new Date(decoded.payload.exp * 1000),
        user: req.user
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: 'Invalid token',
      message: error.message
    });
  }
});

// Protected API endpoint - returns user info from JWT
router.get('/api/profile', requireLogin, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

// Public API endpoint - get all rides
router.get('/api/rides', async (req, res) => {
  try {
    const Ride = require('../models/Ride');
    const rides = await Ride.find().populate('driver', 'username driverName contact');
    res.json({
      success: true,
      rides
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching rides'
    });
  }
});

module.exports = router;