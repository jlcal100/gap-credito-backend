const prisma = require('../config/database');

async function list(req, res, next) {
  try {
    const where = {};
    if (req.query.tipo) where.tipo = req.query.tipo;
    if (req.query.userId) where.userId = req.query.userId;

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: { usuario: { select: { id: true, nombre: true, ap: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) { next(err); }
}

async function exportCsv(req, res, next) {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: 2000,
    });

    let csv = 'Fecha,Tipo,Usuario,Descripcion\n';
    for (const l of logs) {
      const fecha = new Date(l.timestamp).toISOString();
      csv += `${fecha},${l.tipo},"${l.userName}","${l.desc.replace(/"/g, '""')}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Auditoria_GAP.csv"');
    res.send(csv);
  } catch (err) { next(err); }
}

module.exports = { list, exportCsv };
