const { addAudit } = require('../utils/audit');

/**
 * Middleware de auditoria para rutas protegidas
 * Registra operaciones de escritura y errores
 */
function auditMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const meta = { ip: req.ip, userAgent: req.headers['user-agent'] };

    // Auditar escrituras (POST, PUT, DELETE) y errores de acceso
    if (req.method !== 'GET' || res.statusCode >= 400) {
      const tipo = res.statusCode >= 400 ? 'security' : 'access';
      const desc = `${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`;
      addAudit(tipo, desc, req.user, meta);
    }
  });

  next();
}

module.exports = { auditMiddleware };
