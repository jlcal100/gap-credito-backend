/**
 * Middleware que restringe acceso solo a administradores
 * Debe usarse DESPUES de authenticate
 */
function adminOnly(req, res, next) {
  if (req.user.tipo !== 'ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
  next();
}

/**
 * Helper para construir filtro de estacion
 * Operadores solo ven datos de su estacion
 * Admins ven todo (opcionalmente filtrado por query param estacionId)
 */
function getEstacionFilter(req) {
  if (req.user.tipo === 'OPERADOR') {
    return { estacionId: req.user.estacionId };
  }
  // Admin: si envian ?estacionId=xxx, filtrar por esa estacion
  if (req.query.estacionId) {
    return { estacionId: req.query.estacionId };
  }
  return {}; // Sin filtro: ve todo
}

module.exports = { adminOnly, getEstacionFilter };
