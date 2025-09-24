
const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');



router.get('/register', (req, res) => {
  res.render('register', { error: null });
});
router.post('/register', userController.register);



router.get('/login', (req, res) => {
  res.render('login', { error: null });
});
router.post('/login', userController.login);

router.get('/logout', (req, res) => {
  res.clearCookie('user');
  res.redirect('/');
});

module.exports = router;
