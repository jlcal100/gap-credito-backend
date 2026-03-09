/**
 * Middleware centralizado de manejo de errores
 * En produccion no expone detalles internos
 */
function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';

  // Log completo siempre (para debugging en servidor)
  console.error(`[ERROR] ${req.method} ${req.path} - ${err.message}`);
  if (!isProd) console.error(err.stack);

  // Errores de CORS
  if (err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ error: 'Origen no autorizado' });
  }

  // Errores de Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Registro duplicado',
      detail: isProd ? undefined : `Valor unico duplicado: ${err.meta?.target?.join(', ')}`,
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }

  // Errores de validacion
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validacion',
      detail: isProd ? undefined : err.message,
    });
  }

  // Errores de JSON malformado
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON malformado' });
  }

  // Error generico - NUNCA exponer stack trace en produccion
  res.status(err.status || 500).json({
    error: isProd ? 'Error interno del servidor' : (err.message || 'Error interno del servidor'),
  });
}

module.exports = errorHandler;
