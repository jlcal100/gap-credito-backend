const { Router } = require('express');
const ctrl = require('../controllers/estaciones.controller');
const { adminOnly } = require('../middleware/roleGuard');

const router = Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', adminOnly, ctrl.create);
router.put('/:id', adminOnly, ctrl.update);

module.exports = router;
