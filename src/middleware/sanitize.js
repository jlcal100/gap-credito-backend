/**
 * Middleware de sanitización contra XSS
 * Limpia recursivamente strings en req.body, req.query, req.params
 */
function sanitizeInput(req, res, next) {
  if (req.body) req.body = deepSanitize(req.body);
  if (req.query) req.query = deepSanitize(req.query);
  if (req.params) req.params = deepSanitize(req.params);
  next();
}

function deepSanitize(obj) {
  if (typeof obj === 'string') return escapeHtml(obj);
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (obj && typeof obj === 'object') {
    const clean = {};
    for (const key of Object.keys(obj)) {
      clean[key] = deepSanitize(obj[key]);
    }
    return clean;
  }
  return obj;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Middleware para rechazar payloads demasiado grandes
 */
function payloadSizeGuard(maxBytes = 1048576) { // 1MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxBytes) {
      return res.status(413).json({ error: 'Payload demasiado grande' });
    }
    next();
  };
}

/**
 * Middleware para bloquear headers sospechosos
 */
function suspiciousHeaderGuard(req, res, next) {
  // Bloquear si no hay User-Agent (bots basicos)
  if (!req.headers['user-agent']) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
}

module.exports = { sanitizeInput, payloadSizeGuard, suspiciousHeaderGuard };
