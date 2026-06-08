const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');

router.post('/register', usersController.registerUser);
router.post('/login', usersController.loginUser);
router.post('/:id/register-chess', usersController.registerChess);
router.get('/:id', usersController.getUser);
router.put('/:id', usersController.updateUser);

module.exports = router;
