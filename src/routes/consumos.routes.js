const { Router } = require('express');
const ctrl = require('../controllers/consumos.controller');

const router = Router();

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);

module.exports = router;
