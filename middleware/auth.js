const jwt = require('jsonwebtoken');
const config = require('../config/default');

module.exports = {
  requireLogin: (req, res, next) => {
   
    const token = req.cookies.token || 
                  (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!token) {
      return res.redirect('/login');
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded;
      res.locals.user = decoded.username;
      res.locals.role = decoded.role;
      next();
    } catch (error) {
      console.error('JWT verification failed:', error);
      res.clearCookie('token');
      return res.redirect('/login');
    }
  },

  requireRole: role => (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).send(`Only ${role}s allowed`);
    }
    next();
  },

  // Optional middleware for routes that work with or without auth
  optionalAuth: (req, res, next) => {
    const token = req.cookies.token || 
                  (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        res.locals.user = decoded.username;
        res.locals.role = decoded.role;
      } catch (error) {
        console.error('JWT verification failed:', error);
        res.clearCookie('token');
      }
    }
    next();
  }
};
