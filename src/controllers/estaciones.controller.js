const prisma = require('../config/database');
const { addAudit } = require('../utils/audit');
const { getEstacionFilter } = require('../middleware/roleGuard');
const { generateEstacionNum } = require('../utils/helpers');

async function list(req, res, next) {
  try {
    const filter = getEstacionFilter(req);
    const estaciones = await prisma.estacion.findMany({
      where: filter.estacionId ? { id: filter.estacionId } : {},
      orderBy: { num: 'asc' },
    });
    res.json(estaciones);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const estacion = await prisma.estacion.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { clientes: true, usuarios: true, contratos: true } },
      },
    });
    if (!estacion) return res.status(404).json({ error: 'Estacion no encontrada' });
    res.json(estacion);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const count = await prisma.estacion.count();
    const num = generateEstacionNum(count + 1);

    const estacion = await prisma.estacion.create({
      data: { ...req.body, num },
    });

    await addAudit('create', `Estacion creada: ${estacion.nombre} (${num})`, req.user);
    res.status(201).json(estacion);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    // No permitir cambiar el num
    const { num, ...data } = req.body;

    const estacion = await prisma.estacion.update({
      where: { id },
      data,
    });

    await addAudit('update', `Estacion actualizada: ${estacion.nombre}`, req.user);
    res.json(estacion);
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update };
