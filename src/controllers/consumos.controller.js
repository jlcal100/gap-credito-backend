const prisma = require('../config/database');
const { addAudit } = require('../utils/audit');
const { getEstacionFilter } = require('../middleware/roleGuard');
const { generateRef } = require('../utils/helpers');

async function list(req, res, next) {
  try {
    const filter = getEstacionFilter(req);
    const where = { ...filter };
    if (req.query.status) where.status = req.query.status.toUpperCase();
    if (req.query.clienteId) where.clienteId = req.query.clienteId;
    if (req.query.contratoId) where.contratoId = req.query.contratoId;

    const consumos = await prisma.consumo.findMany({
      where,
      include: {
        cliente: { select: { id: true, razonSocial: true } },
        contrato: { select: { id: true, numero: true, condicionesPago: true } },
        estacion: { select: { id: true, nombre: true } },
        registrador: { select: { id: true, nombre: true, ap: true } },
      },
      orderBy: { fechaConsumo: 'desc' },
    });
    res.json(consumos);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const consumo = await prisma.consumo.findUnique({
      where: { id: req.params.id },
      include: {
        cliente: true,
        contrato: true,
        estacion: { select: { id: true, nombre: true } },
        registrador: { select: { id: true, nombre: true, ap: true } },
      },
    });
    if (!consumo) return res.status(404).json({ error: 'Consumo no encontrado' });
    res.json(consumo);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { clienteId, contratoId, monto, descripcion, numFactura, fechaConsumo } = req.body;

    if (!clienteId) return res.status(400).json({ error: 'clienteId requerido' });
    if (!contratoId) return res.status(400).json({ error: 'contratoId requerido' });
    if (!monto || monto <= 0) return res.status(400).json({ error: 'monto debe ser positivo' });

    // Verificar contrato vigente
    const contrato = await prisma.contrato.findUnique({ where: { id: contratoId } });
    if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
    if (contrato.status !== 'VIGENTE') return res.status(400).json({ error: 'Contrato no vigente' });
    if (contrato.clienteId !== clienteId) return res.status(400).json({ error: 'Contrato no pertenece al cliente' });

    // Verificar linea disponible
    const consumosPendientes = await prisma.consumo.aggregate({
      where: {
        contratoId,
        status: { in: ['PENDIENTE', 'VENCIDO'] },
      },
      _sum: { monto: true },
    });
    const usado = consumosPendientes._sum.monto || 0;
    const disponible = contrato.lineaCredito - usado;

    if (monto > disponible) {
      return res.status(400).json({
        error: 'Monto excede linea disponible',
        detail: {
          lineaCredito: contrato.lineaCredito,
          usado,
          disponible,
          montoSolicitado: monto,
        },
      });
    }

    const estacionId = req.user.tipo === 'OPERADOR' ? req.user.estacionId : contrato.estacionId;

    const consumo = await prisma.consumo.create({
      data: {
        monto,
        descripcion: descripcion || 'Consumo combustible',
        numFactura: numFactura || '',
        fechaConsumo: new Date(fechaConsumo || Date.now()),
        ref: generateRef('CONS'),
        status: 'PENDIENTE',
        estacionId,
        clienteId,
        contratoId,
        registradoPor: req.user.id,
      },
    });

    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    await addAudit('create', `Consumo registrado: $${(monto / 100).toFixed(2)} - ${cliente?.razonSocial}`, req.user);
    res.status(201).json(consumo);
  } catch (err) { next(err); }
}

module.exports = { list, getById, create };
