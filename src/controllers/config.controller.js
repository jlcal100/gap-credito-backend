const prisma = require('../config/database');
const { addAudit } = require('../utils/audit');

// Helper para convertir BigInt a Number en JSON
function serializeConfig(config) {
  return JSON.parse(JSON.stringify(config, (_, v) => typeof v === 'bigint' ? Number(v) : v));
}

async function get(req, res, next) {
  try {
    let config = await prisma.config.findUnique({ where: { id: 'singleton' } });
    if (!config) {
      config = await prisma.config.create({ data: { id: 'singleton' } });
    }
    res.json(serializeConfig(config));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id, ...data } = req.body;
    // Convertir maxLineaCredito a BigInt si viene
    if (data.maxLineaCredito !== undefined) {
      data.maxLineaCredito = BigInt(data.maxLineaCredito);
    }
    const config = await prisma.config.upsert({
      where: { id: 'singleton' },
      update: data,
      create: { id: 'singleton', ...data },
    });
    await addAudit('update', 'Configuracion del sistema actualizada', req.user);
    res.json(serializeConfig(config));
  } catch (err) { next(err); }
}

module.exports = { get, update };
