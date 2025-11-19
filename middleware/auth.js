const jwt = require('jsonwebtoken');
const config = require('../config/default');

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  
  if (!token) {
    // If this is an API/XHR request, return JSON 401 so client can handle it
    if (req.path && req.path.startsWith('/api')) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded.user;
    res.locals.user = decoded.user.username;
    res.locals.role = decoded.user.role;
    res.locals.userId = decoded.user.id;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.clearCookie('token');
    if (req.path && req.path.startsWith('/api')) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    return res.redirect('/login');
  }
};

// Authentication middleware
module.exports = {
  requireLogin: authenticateToken,
  requireRole: role => (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).send(`Only ${role}s allowed`);
    }
    next();
  }
};
