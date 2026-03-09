require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authenticate = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE GLOBAL ====================
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));

// ==================== HEALTH CHECK (sin auth) ====================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'GAP Credito Backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ==================== SETUP TEMPORAL ====================
app.get('/api/setup', (req, res) => {
  res.json({ status: 'running', message: 'Ejecutando seed...' });
  const { exec } = require('child_process');
  exec('npx prisma db push --skip-generate 2>&1 && node prisma/seed.js 2>&1', (err, stdout, stderr) => {
    console.log('SETUP OUTPUT:', stdout);
    if (err) console.error('SETUP ERROR:', stderr);
    else console.log('SETUP COMPLETE');
  });
});

// ==================== RUTAS PUBLICAS ====================
app.use('/api/auth', require('./routes/auth.routes'));

// ==================== RUTAS PROTEGIDAS ====================
app.use('/api/dashboard', authenticate, require('./routes/dashboard.routes'));
app.use('/api/estaciones', authenticate, require('./routes/estaciones.routes'));
app.use('/api/clientes', authenticate, require('./routes/clientes.routes'));
app.use('/api/contratos', authenticate, require('./routes/contratos.routes'));
app.use('/api/consumos', authenticate, require('./routes/consumos.routes'));
app.use('/api/pagos', authenticate, require('./routes/pagos.routes'));
app.use('/api/usuarios', authenticate, require('./routes/usuarios.routes'));
app.use('/api/config', authenticate, require('./routes/config.routes'));
app.use('/api/audit', authenticate, require('./routes/audit.routes'));

// ==================== 404 ====================
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
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
