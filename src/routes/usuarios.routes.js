const { Router } = require('express');
const ctrl = require('../controllers/usuarios.controller');
const { adminOnly } = require('../middleware/roleGuard');

const router = Router();

router.get('/', adminOnly, ctrl.list);
router.get('/:id', adminOnly, ctrl.getById);
router.post('/', adminOnly, ctrl.create);
router.put('/:id', adminOnly, ctrl.update);

module.exports = router;
