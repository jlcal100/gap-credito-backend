const prisma = require('../config/database');
const { addAudit } = require('../utils/audit');
const { getEstacionFilter } = require('../middleware/roleGuard');

async function list(req, res, next) {
  try {
    const filter = getEstacionFilter(req);
    const where = { ...filter };
    if (req.query.clienteId) where.clienteId = req.query.clienteId;
    if (req.query.contratoId) where.contratoId = req.query.contratoId;

    const pagos = await prisma.pago.findMany({
      where,
      include: {
        cliente: { select: { id: true, razonSocial: true } },
        contrato: { select: { id: true, numero: true } },
        estacion: { select: { id: true, nombre: true } },
        registrador: { select: { id: true, nombre: true, ap: true } },
      },
      orderBy: { fechaDeposito: 'desc' },
    });
    res.json(pagos);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const pago = await prisma.pago.findUnique({
      where: { id: req.params.id },
      include: { cliente: true, contrato: true, estacion: true, registrador: true },
    });
    if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json(pago);
  } catch (err) { next(err); }
}

/**
 * POST /api/pagos
 * Registra un pago y aplica FIFO contra consumos pendientes
 */
async function create(req, res, next) {
  try {
    const { clienteId, contratoId, monto, metodo, refBancaria, fechaDeposito, comprobante, nota } = req.body;

    if (!clienteId) return res.status(400).json({ error: 'clienteId requerido' });
    if (!contratoId) return res.status(400).json({ error: 'contratoId requerido' });
    if (!monto || monto <= 0) return res.status(400).json({ error: 'monto debe ser positivo' });

    // Verificar contrato
    const contrato = await prisma.contrato.findUnique({ where: { id: contratoId } });
    if (!contrato) return res.status(404).json({ error: 'Contrato no encontrado' });

    const estacionId = req.user.tipo === 'OPERADOR' ? req.user.estacionId : contrato.estacionId;

    // Crear el pago
    const pago = await prisma.pago.create({
      data: {
        monto,
        metodo: metodo ? metodo.toUpperCase() : 'TRANSFERENCIA',
        refBancaria: refBancaria || '',
        fechaDeposito: new Date(fechaDeposito || Date.now()),
        comprobante: comprobante || '',
        nota: nota || '',
        status: 'CONFIRMADO',
        estacionId,
        clienteId,
        contratoId,
        registradoPor: req.user.id,
      },
    });

    // ===== APLICACION FIFO =====
    // Obtener consumos pendientes del cliente ordenados por fecha (mas antiguos primero)
    const consumosPendientes = await prisma.consumo.findMany({
      where: {
        clienteId,
        status: { in: ['PENDIENTE', 'VENCIDO'] },
      },
      orderBy: { fechaConsumo: 'asc' },
    });

    let restante = monto;
    const consumosPagados = [];

    for (const consumo of consumosPendientes) {
      if (restante <= 0) break;
      if (restante >= consumo.monto) {
        // Pagar completo
        await prisma.consumo.update({
          where: { id: consumo.id },
          data: { status: 'PAGADO' },
        });
        restante -= consumo.monto;
        consumosPagados.push(consumo.id);
      }
      // Si el restante es menor que el consumo, no se aplica parcial
      // (misma logica que el frontend original)
    }

    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    await addAudit(
      'create',
      `Pago registrado: $${(monto / 100).toFixed(2)} - ${cliente?.razonSocial}. Consumos liquidados: ${consumosPagados.length}`,
      req.user
    );

    res.status(201).json({
      pago,
      consumosLiquidados: consumosPagados.length,
      montoRestante: restante,
    });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create };
