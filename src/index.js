require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const hpp = require('hpp');
const authenticate = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter, loginLimiter, writeLimiter } = require('./middleware/rateLimiter');
const { sanitizeInput, payloadSizeGuard, suspiciousHeaderGuard } = require('./middleware/sanitize');
const { auditMiddleware } = require('./middleware/audit');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== SEGURIDAD: TRUST PROXY (Railway) ====================
app.set('trust proxy', 1);

// ==================== SEGURIDAD: HELMET (Headers) ====================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// ==================== SEGURIDAD: CORS RESTRINGIDO ====================
const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (curl, mobile apps, file://)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Permitir file:// protocol
    if (origin.startsWith('file://') || origin === 'null') {
      return callback(null, true);
    }
    callback(new Error('Origen no permitido por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight 24h
}));

// ==================== SEGURIDAD: RATE LIMITING GLOBAL ====================
app.use(globalLimiter);

// ==================== SEGURIDAD: PARSEO Y SANITIZACION ====================
app.use(express.json({ limit: '1mb' })); // Reducido de 10mb a 1mb
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(hpp()); // Proteccion contra HTTP Parameter Pollution
app.use(sanitizeInput); // Sanitizar XSS en inputs
app.use(payloadSizeGuard(1048576)); // Rechazar payloads > 1MB

// ==================== LOGGING ====================
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ==================== SEGURIDAD: DESHABILITAR INFO DEL SERVIDOR ====================
app.disable('x-powered-by');

// ==================== HEALTH CHECK (sin auth) ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'GAP Credito Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ==================== RUTAS PUBLICAS (con rate limit extra en login) ====================
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', require('./routes/auth.routes'));

// ==================== MIDDLEWARE PROTEGIDO ====================
app.use(authenticate);
app.use(auditMiddleware); // Auditar todas las requests autenticadas

// ==================== RUTAS PROTEGIDAS (POST/PUT/DELETE con write limiter) ====================
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/estaciones', writeLimiter, require('./routes/estaciones.routes'));
app.use('/api/clientes', writeLimiter, require('./routes/clientes.routes'));
app.use('/api/contratos', writeLimiter, require('./routes/contratos.routes'));
app.use('/api/consumos', writeLimiter, require('./routes/consumos.routes'));
app.use('/api/pagos', writeLimiter, require('./routes/pagos.routes'));
app.use('/api/usuarios', writeLimiter, require('./routes/usuarios.routes'));
app.use('/api/config', writeLimiter, require('./routes/config.routes'));
app.use('/api/audit', require('./routes/audit.routes'));

// ==================== 404 ====================
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
  // No exponer método y path en producción
});

// ==================== ERROR HANDLER ====================
app.use(errorHandler);

// ==================== START ====================
app.listen(PORT, () => {
  console.log(`\n  GAP Credito Backend v1.0.0`);
  console.log(`  Servidor corriendo en http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/api/health`);
  console.log(`  Entorno: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
