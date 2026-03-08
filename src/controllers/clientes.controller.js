const prisma = require('../config/database');
const { addAudit } = require('../utils/audit');
const { getEstacionFilter } = require('../middleware/roleGuard');

async function list(req, res, next) {
  try {
    const filter = getEstacionFilter(req);
    const clientes = await prisma.cliente.findMany({
      where: { ...filter, ...(req.query.activo !== undefined ? { activo: req.query.activo === 'true' } : {}) },
      include: { estacion: { select: { id: true, nombre: true, num: true } } },
      orderBy: { razonSocial: 'asc' },
    });
    res.json(clientes);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const cliente = await prisma.cliente.findUnique({
      where: { id: req.params.id },
      include: {
        estacion: { select: { id: true, nombre: true, num: true } },
        contratos: true,
        consumos: { orderBy: { fechaConsumo: 'desc' } },
        pagos: { orderBy: { fechaDeposito: 'desc' } },
      },
    });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Calcular resumen financiero
    const contratosVigentes = cliente.contratos.filter(c => c.status === 'VIGENTE');
    const lineaTotal = contratosVigentes.reduce((s, c) => s + c.lineaCredito, 0);
    const consumosPendientes = cliente.consumos.filter(c => c.status === 'PENDIENTE' || c.status === 'VENCIDO');
    const usado = consumosPendientes.reduce((s, c) => s + c.monto, 0);
    const pagado = cliente.pagos.filter(p => p.status === 'CONFIRMADO').reduce((s, p) => s + p.monto, 0);

    // Calcular vencidos
    const now = new Date();
    let vencido = 0;
    for (const cons of consumosPendientes) {
      const contrato = cliente.contratos.find(ct => ct.id === cons.contratoId);
      if (contrato) {
        const limite = new Date(cons.fechaConsumo);
        limite.setDate(limite.getDate() + contrato.condicionesPago);
        if (now > limite) vencido += cons.monto;
      }
    }

    res.json({
      ...cliente,
      resumen: {
        lineaTotal,
        usado,
        disponible: lineaTotal - usado,
        pagado,
        vencido,
      },
    });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { razonSocial, rfc, estacionId } = req.body;
    if (!razonSocial) return res.status(400).json({ error: 'Razon social es requerida' });
    if (!rfc) return res.status(400).json({ error: 'RFC es requerido' });

    // Operadores solo pueden crear en su estacion
    const finalEstacionId = req.user.tipo === 'OPERADOR' ? req.user.estacionId : estacionId;
    if (!finalEstacionId) return res.status(400).json({ error: 'estacionId es requerido' });

    const cliente = await prisma.cliente.create({
      data: { ...req.body, estacionId: finalEstacionId },
    });

    await addAudit('create', `Cliente creado: ${razonSocial}`, req.user);
    res.status(201).json(cliente);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const cliente = await prisma.cliente.update({
      where: { id },
      data: req.body,
    });
    await addAudit('update', `Cliente actualizado: ${cliente.razonSocial}`, req.user);
    res.json(cliente);
  } catch (err) { next(err); }
}

/**
 * GET /api/clientes/:id/estado-cuenta
 */
async function estadoCuenta(req, res, next) {
  try {
    const { id } = req.params;
    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const consumos = await prisma.consumo.findMany({
      where: { clienteId: id },
      orderBy: { fechaConsumo: 'asc' },
    });
    const pagos = await prisma.pago.findMany({
      where: { clienteId: id, status: 'CONFIRMADO' },
      orderBy: { fechaDeposito: 'asc' },
    });

    // Combinar movimientos
    const movimientos = [
      ...consumos.map(c => ({
        fecha: c.fechaConsumo,
        tipo: 'Consumo',
        descripcion: c.descripcion,
        cargo: c.monto,
        abono: 0,
        ref: c.ref,
      })),
      ...pagos.map(p => ({
        fecha: p.fechaDeposito,
        tipo: 'Pago',
        descripcion: `${p.metodo} ${p.refBancaria}`,
        cargo: 0,
        abono: p.monto,
        ref: p.refBancaria,
      })),
    ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // Calcular saldo acumulado
    let saldo = 0;
    const movimientosConSaldo = movimientos.map(m => {
      saldo += m.cargo - m.abono;
      return { ...m, saldo };
    });

    res.json({
      cliente: { id: cliente.id, razonSocial: cliente.razonSocial, rfc: cliente.rfc },
      movimientos: movimientosConSaldo,
      saldoFinal: saldo,
    });
  } catch (err) { next(err); }
}

/**
 * GET /api/clientes/:id/estado-cuenta/csv
 */
async function estadoCuentaCsv(req, res, next) {
  try {
    const { id } = req.params;
    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    const consumos = await prisma.consumo.findMany({ where: { clienteId: id }, orderBy: { fechaConsumo: 'asc' } });
    const pagos = await prisma.pago.findMany({ where: { clienteId: id, status: 'CONFIRMADO' }, orderBy: { fechaDeposito: 'asc' } });

    const movimientos = [
      ...consumos.map(c => ({ fecha: c.fechaConsumo, tipo: 'Consumo', desc: c.descripcion, cargo: c.monto, abono: 0 })),
      ...pagos.map(p => ({ fecha: p.fechaDeposito, tipo: 'Pago', desc: `${p.metodo} ${p.refBancaria}`, cargo: 0, abono: p.monto })),
    ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    let saldo = 0;
    let csv = 'Fecha,Tipo,Descripcion,Cargo,Abono,Saldo\n';
    for (const m of movimientos) {
      saldo += m.cargo - m.abono;
      const fecha = new Date(m.fecha).toISOString().split('T')[0];
      csv += `${fecha},${m.tipo},"${m.desc}",${(m.cargo / 100).toFixed(2)},${(m.abono / 100).toFixed(2)},${(saldo / 100).toFixed(2)}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="EdoCta_${cliente.razonSocial.replace(/\s/g, '_')}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, estadoCuenta, estadoCuentaCsv };
