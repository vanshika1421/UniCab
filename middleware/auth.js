// Authentication middleware
module.exports = {
  requireLogin: (req, res, next) => {
    if (!res.locals.user) return res.redirect('/login');
    next();
  },
  requireRole: role => (req, res, next) => {
    if (res.locals.role !== role) return res.status(403).send(`Only ${role}s allowed`);
    next();
  }
};
