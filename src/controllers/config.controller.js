const prisma = require('../config/database');
const { addAudit } = require('../utils/audit');

async function get(req, res, next) {
  try {
    let config = await prisma.config.findUnique({ where: { id: 'singleton' } });
    if (!config) {
      config = await prisma.config.create({ data: { id: 'singleton' } });
    }
    res.json(config);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id, ...data } = req.body;
    const config = await prisma.config.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });
    await addAudit('update', 'Configuracion del sistema actualizada', req.user);
    res.json(config);
  } catch (err) { next(err); }
}

module.exports = { get, update };
