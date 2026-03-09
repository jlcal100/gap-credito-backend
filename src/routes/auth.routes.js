const { Router } = require('express');
const { login, verify, refresh, logout } = require('../controllers/auth.controller');
const authenticate = require('../middleware/auth');

const router = Router();

router.post('/login', login);
router.post('/verify', verify);
router.post('/refresh', refresh);
router.post('/logout', authenticate, logout);

module.exports = router;
