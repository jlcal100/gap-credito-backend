const { Router } = require('express');
const ctrl = require('../controllers/audit.controller');
const { adminOnly } = require('../middleware/roleGuard');

const router = Router();

router.get('/', adminOnly, ctrl.list);
router.get('/export/csv', adminOnly, ctrl.exportCsv);

module.exports = router;
