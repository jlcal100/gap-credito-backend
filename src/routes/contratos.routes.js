const { Router } = require('express');
const ctrl = require('../controllers/contratos.controller');

const router = Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);

module.exports = router;
