const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { addAudit } = require('../utils/audit');

async function list(req, res, next) {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true, nombre: true, ap: true, email: true, tipo: true,
        estacionId: true, rfc: true, tel: true, activo: true, createdAt: true,
        estacion: { select: { id: true, nombre: true, num: true } },
      },
      orderBy: { nombre: 'asc' },
    });
    res.json(usuarios);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, nombre: true, ap: true, email: true, tipo: true,
        estacionId: true, rfc: true, tel: true, pin: true, activo: true, createdAt: true,
        estacion: { select: { id: true, nombre: true, num: true } },
      },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { nombre, ap, email, password, tipo, estacionId, rfc, tel, pin } = req.body;

    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    if (!email) return res.status(400).json({ error: 'Email requerido' });
    if (!password) return res.status(400).json({ error: 'Contraseña requerida' });

    // Validate password policy
    if (password.length < 8) return res.status(400).json({ error: 'Minimo 8 caracteres' });
    if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Requiere al menos 1 mayuscula' });
    if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Requiere al menos 1 numero' });

    if (tipo === 'OPERADOR' && !estacionId) {
      return res.status(400).json({ error: 'Operadores requieren estacionId' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        ap: ap || '',
        email: email.toLowerCase().trim(),
        passwordHash,
        tipo: tipo || 'OPERADOR',
        estacionId: (tipo === 'ADMIN' || tipo === 'SUPERADMIN') ? null : estacionId,
        rfc: rfc || '',
        tel: tel || '',
        pin: pin || '',
      },
    });

    await addAudit('create', `Usuario creado: ${nombre} ${ap || ''} (${tipo})`, req.user);

    // No devolver hash
    const { passwordHash: _, ...safe } = usuario;
    res.status(201).json(safe);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { password, passwordHash: _, ...data } = req.body;

    // Si envian nueva contraseña
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: 'Minimo 8 caracteres' });
      if (!/[A-Z]/.test(password)) return res.status(400).json({ error: 'Requiere 1 mayuscula' });
      if (!/[0-9]/.test(password)) return res.status(400).json({ error: 'Requiere 1 numero' });
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    if (data.email) data.email = data.email.toLowerCase().trim();
    if (data.tipo === 'ADMIN' || data.tipo === 'SUPERADMIN') data.estacionId = null;

    const usuario = await prisma.usuario.update({ where: { id }, data });
    await addAudit('update', `Usuario actualizado: ${usuario.nombre} ${usuario.ap}`, req.user);

    const { passwordHash: __, ...safe } = usuario;
    res.json(safe);
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update };
