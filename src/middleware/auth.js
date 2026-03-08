const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticacion JWT
 * Verifica el token en el header Authorization: Bearer <token>
 * Agrega req.user con { id, email, tipo, estacionId }
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      tipo: decoded.tipo,
      estacionId: decoded.estacionId,
      nombre: decoded.nombre,
      ap: decoded.ap,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token invalido' });
  }
}

module.exports = authenticate;
