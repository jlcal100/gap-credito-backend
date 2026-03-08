const prisma = require('../config/database');
const { getEstacionFilter } = require('../middleware/roleGuard');

/**
 * GET /api/dashboard
 * Retorna KPIs calculados para el dashboard principal
 */
async function getDashboard(req, res, next) {
  try {
    const filter = getEstacionFilter(req);

    // Contratos vigentes
    const contratos = await prisma.contrato.findMany({
      where: { ...filter, status: 'VIGENTE' },
    });
    const creditoOtorgado = contratos.reduce((s, c) => s + c.lineaCredito, 0);

    // Consumos pendientes y vencidos
    const consumos = await prisma.consumo.findMany({
      where: { ...filter, status: { in: ['PENDIENTE', 'VENCIDO'] } },
      include: { contrato: { select: { condicionesPago: true } } },
    });
    const creditoUtilizado = consumos.reduce((s, c) => s + c.monto, 0);

    // Cartera vencida
    const now = new Date();
    let carteraVencida = 0;
    for (const cons of consumos) {
      const limite = new Date(cons.fechaConsumo);
      limite.setDate(limite.getDate() + (cons.contrato?.condicionesPago || 30));
      if (now > limite) carteraVencida += cons.monto;
    }

    // Pagos recibidos
    const pagosAgg = await prisma.pago.aggregate({
      where: { ...filter, status: 'CONFIRMADO' },
      _sum: { monto: true },
    });
    const pagosRecibidos = pagosAgg._sum.monto || 0;

    // Indicadores
    const morosidad = creditoUtilizado > 0 ? ((carteraVencida / creditoUtilizado) * 100) : 0;
    const rotacion = creditoOtorgado > 0 ? ((creditoUtilizado / creditoOtorgado) * 100) : 0;

    // Dias promedio de cobro
    const consumosPagados = await prisma.consumo.findMany({
      where: { ...filter, status: 'PAGADO' },
    });
    let totalDias = 0, contados = 0;
    for (const cp of consumosPagados) {
      if (cp.updatedAt && cp.fechaConsumo) {
        const dias = Math.floor((new Date(cp.updatedAt) - new Date(cp.fechaConsumo)) / 86400000);
        if (dias >= 0) { totalDias += dias; contados++; }
      }
    }
    const diasPromCobro = contados > 0 ? Math.round(totalDias / contados) : 0;

    // Contratos por vencer (proximos 30 dias)
    const en30Dias = new Date(now.getTime() + 30 * 86400000);
    const contratosPorVencer = await prisma.contrato.count({
      where: {
        ...filter,
        status: 'VIGENTE',
        fechaVencimiento: { lte: en30Dias, gte: now },
      },
    });

    // Clientes con deuda vencida
    const clientesMorosos = new Set();
    for (const cons of consumos) {
      const limite = new Date(cons.fechaConsumo);
      limite.setDate(limite.getDate() + (cons.contrato?.condicionesPago || 30));
      if (now > limite) clientesMorosos.add(cons.clienteId);
    }

    // Datos por estacion (para graficas)
    const estaciones = await prisma.estacion.findMany({
      where: filter.estacionId ? { id: filter.estacionId } : { activa: true },
      select: { id: true, nombre: true, num: true },
    });

    const porEstacion = [];
    for (const est of estaciones) {
      const estContratos = contratos.filter(c => c.estacionId === est.id);
      const estConsumos = consumos.filter(c => c.estacionId === est.id);
      porEstacion.push({
        estacion: est.nombre,
        num: est.num,
        creditoOtorgado: estContratos.reduce((s, c) => s + c.lineaCredito, 0),
        creditoUtilizado: estConsumos.reduce((s, c) => s + c.monto, 0),
      });
    }

    res.json({
      kpis: {
        creditoOtorgado,
        creditoUtilizado,
        creditoDisponible: creditoOtorgado - creditoUtilizado,
        pagosRecibidos,
        carteraVencida,
        morosidad: Math.round(morosidad * 100) / 100,
        rotacion: Math.round(rotacion * 100) / 100,
        diasPromCobro,
      },
      alertas: {
        contratosPorVencer,
        clientesMorosos: clientesMorosos.size,
      },
      porEstacion,
    });
  } catch (err) { next(err); }
}

module.exports = { getDashboard };
