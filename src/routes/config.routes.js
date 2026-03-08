const { Router } = require('express');
const ctrl = require('../controllers/config.controller');
const { adminOnly } = require('../middleware/roleGuard');

const router = Router();

router.get('/', ctrl.get);
router.put('/', adminOnly, ctrl.update);

module.exports = router;
