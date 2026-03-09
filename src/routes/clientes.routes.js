const { Router } = require('express');
const ctrl = require('../controllers/clientes.controller');

const router = Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/estado-cuenta', ctrl.estadoCuenta);
router.get('/:id/estado-cuenta/csv', ctrl.estadoCuentaCsv);

module.exports = router;
