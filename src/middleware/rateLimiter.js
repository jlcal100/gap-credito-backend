const rateLimit = require('express-rate-limit');

/**
 * Rate limiter global - 100 requests por minuto por IP
 */
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intente de nuevo en un minuto.' },
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
});

/**
 * Rate limiter para login - 5 intentos por 15 min por IP
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login. Intente de nuevo en 15 minutos.' },
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  skipSuccessfulRequests: true,
});

/**
 * Rate limiter para operaciones sensibles (crear, editar, eliminar) - 30 por minuto
 */
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas operaciones de escritura. Intente de nuevo en un minuto.' },
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
});

module.exports = { globalLimiter, loginLimiter, writeLimiter };
