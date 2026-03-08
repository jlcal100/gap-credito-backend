const prisma = require('../config/database');
const { addAudit } = require('../utils/audit');
const { getEstacionFilter } = require('../middleware/roleGuard');
const { generateContratoNum } = require('../utils/helpers');

async function list(req, res, next) {
  try {
    const filter = getEstacionFilter(req);
    const where = { ...filter };
    if (req.query.status) where.status = req.query.status.toUpperCase();
    if (req.query.clienteId) where.clienteId = req.query.clienteId;

    const contratos = await prisma.contrato.findMany({
      where,
      include: {
        cliente: { select: { id: true, razonSocial: true, rfc: true } },
        estacion: { select: { id: true, nombre: true, num: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(contratos);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const contrato = await prisma.contrato.findUnique({
      where: { id: req.params.id },
      include: {
        cliente: true,
        estacion: { select: { id: true, nombre: true, num: true } },
        consumos: { orderBy: { fechaConsumo: 'desc' } },
        pagos: { orderBy: { fechaDeposito: 'desc' } },
      },
    });
    if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });
    res.json(contrato);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { clienteId, lineaCredito, fechaInicio, fechaVencimiento } = req.body;
    if (!clienteId) return res.status(400).json({ error: 'clienteId es requerido' });
    if (!lineaCredito || lineaCredito <= 0) return res.status(400).json({ error: 'lineaCredito debe ser positivo' });

    // Verificar cliente existe
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: { estacion: true },
    });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Verificar config de linea maxima
    const config = await prisma.config.findUnique({ where: { id: 'singleton' } });
    if (config && lineaCredito > config.maxLineaCredito) {
      return res.status(400).json({ error: `Linea de credito excede el maximo permitido: $${(config.maxLineaCredito / 100).toFixed(2)}` });
    }

    // Generar numero de contrato
    const count = await prisma.contrato.count() + 1;
    const year = new Date().getFullYear();
    const numero = generateContratoNum(cliente.estacion.num, year, count);

    const estacionId = req.user.tipo === 'OPERADOR' ? req.user.estacionId : cliente.estacionId;

    const contrato = await prisma.contrato.create({
      data: {
        ...req.body,
        numero,
        estacionId,
        fechaInicio: new Date(fechaInicio),
        fechaVencimiento: new Date(fechaVencimiento),
        status: new Date(fechaVencimiento) < new Date() ? 'VENCIDO' : 'VIGENTE',
      },
    });

    await addAudit('create', `Contrato creado: ${numero} para ${cliente.razonSocial}`, req.user);
    res.status(201).json(contrato);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { numero, ...data } = req.body; // No permitir cambiar numero

    if (data.fechaInicio) data.fechaInicio = new Date(data.fechaInicio);
    if (data.fechaVencimiento) {
      data.fechaVencimiento = new Date(data.fechaVencimiento);
      data.status = data.fechaVencimiento < new Date() ? 'VENCIDO' : 'VIGENTE';
    }

    const contrato = await prisma.contrato.update({ where: { id }, data });
    await addAudit('update', `Contrato actualizado: ${contrato.numero}`, req.user);
    res.json(contrato);
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update };
