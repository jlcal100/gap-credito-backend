const prisma = require('../config/database');

/**
 * Registra una entrada en la bitacora de auditoria
 * @param {string} tipo - Tipo de evento (login, logout, create, update, delete)
 * @param {string} desc - Descripcion del evento
 * @param {object|null} usuario - Usuario que realiza la accion { id, nombre, ap }
 */
async function addAudit(tipo, desc, usuario = null) {
  try {
    await prisma.auditLog.create({
      data: {
        tipo,
        desc,
        userId: usuario?.id || null,
        userName: usuario ? `${usuario.nombre} ${usuario.ap}` : 'Sistema',
      },
    });
  } catch (err) {
    console.error('Error registrando auditoria:', err.message);
  }
}

module.exports = { addAudit };
