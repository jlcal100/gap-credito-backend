const prisma = require('../config/database');

/**
 * Registra una entrada en la bitacora de auditoria
 * @param {string} tipo - Tipo de evento (login, logout, create, update, delete, security)
 * @param {string} desc - Descripcion del evento
 * @param {object|null} usuario - Usuario que realiza la accion { id, nombre, ap }
 * @param {object|null} meta - Metadata adicional (IP, user-agent, etc.)
 */
async function addAudit(tipo, desc, usuario = null, meta = null) {
  try {
    await prisma.auditLog.create({
      data: {
        tipo,
        desc: meta ? `${desc} | IP: ${meta.ip || 'N/A'} | UA: ${(meta.userAgent || 'N/A').substring(0, 100)}` : desc,
        userId: usuario?.id || null,
        userName: usuario ? `${usuario.nombre} ${usuario.ap}` : 'Sistema',
      },
    });
  } catch (err) {
    console.error('Error registrando auditoria:', err.message);
  }
}

/**
 * Middleware de auditoria - registra cada request en rutas protegidas
 */
function auditMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const meta = { ip: req.ip, userAgent: req.headers['user-agent'] };

    // Solo auditar escrituras (POST, PUT, DELETE) y errores
    if (req.method !== 'GET' || res.statusCode >= 400) {
      const tipo = res.statusCode >= 400 ? 'security' : 'access';
      const desc = `${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`;
      addAudit(tipo, desc, req.user, meta);
    }
  });

  next();
}

module.exports = { addAudit, auditMiddleware };
