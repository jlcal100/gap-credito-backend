/**
 * Middleware centralizado de manejo de errores
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${err.message}`, err.stack);

  // Errores de Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Registro duplicado',
      detail: `Ya existe un registro con ese valor unico: ${err.meta?.target?.join(', ')}`,
    });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'No encontrado',
      detail: 'El registro solicitado no existe',
    });
  }

  // Errores de validacion
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Error de validacion',
      detail: err.message,
    });
  }

  // Error generico
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
}

module.exports = errorHandler;
