const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { addAudit } = require('../utils/audit');
const { generateCode, sendVerificationCode } = require('../utils/email');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutos
const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutos
const MAX_CODE_ATTEMPTS = 3;
const SKIP_2FA_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 horas

// In-memory rate limiter (por email)
const loginAttempts = new Map();

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      tipo: user.tipo,
      estacionId: user.estacionId,
      nombre: user.nombre,
      ap: user.ap,
    },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * PASO 1: POST /api/auth/login
 * Valida email+password, envia codigo de 6 digitos al correo
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const emailLower = email.toLowerCase().trim();
    const meta = { ip: req.ip, userAgent: req.headers['user-agent'] };

    // Check rate limit
    const attempts = loginAttempts.get(emailLower);
    if (attempts && attempts.count >= MAX_LOGIN_ATTEMPTS) {
      const elapsed = Date.now() - attempts.lastAttempt;
      if (elapsed < LOCK_DURATION_MS) {
        const wait = Math.ceil((LOCK_DURATION_MS - elapsed) / 1000);
        return res.status(429).json({
          error: `Cuenta bloqueada temporalmente. Espere ${wait} segundos.`,
        });
      }
      loginAttempts.delete(emailLower);
    }

    // Find user
    const user = await prisma.usuario.findUnique({
      where: { email: emailLower },
      include: { estacion: true },
    });

    if (!user || !user.activo) {
      incrementAttempts(emailLower);
      await addAudit('security', `Login fallido (usuario no existe/inactivo): ${emailLower}`, null, meta);
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      incrementAttempts(emailLower);
      await addAudit('security', `Login fallido (password incorrecto): ${emailLower}`, null, meta);
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    // Password correcto
    loginAttempts.delete(emailLower);

    // Verificar si ya paso 2FA en las ultimas 2 horas
    const recentVerification = await prisma.verificationCode.findFirst({
      where: {
        userId: user.id,
        used: true,
        createdAt: { gt: new Date(Date.now() - SKIP_2FA_WINDOW_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentVerification) {
      // Tiene verificacion reciente - login directo sin 2FA
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      await prisma.refreshToken.create({
        data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });
      await addAudit('login', `Login directo (2FA reciente): ${user.nombre} ${user.ap}`, user, meta);
      return res.json({
        accessToken,
        refreshToken,
        user: {
          id: user.id, nombre: user.nombre, ap: user.ap, email: user.email,
          tipo: user.tipo, estacionId: user.estacionId,
          estacion: user.estacion ? { id: user.estacion.id, nombre: user.estacion.nombre, num: user.estacion.num } : null,
        },
      });
    }

    // No tiene verificacion reciente - enviar codigo
    // Invalidar codigos anteriores
    await prisma.verificationCode.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Crear nuevo codigo
    const code = generateCode();
    await prisma.verificationCode.create({
      data: {
        code,
        email: emailLower,
        userId: user.id,
        expiresAt: new Date(Date.now() + CODE_EXPIRY_MS),
      },
    });

    // Enviar email
    const emailResult = await sendVerificationCode(emailLower, code, user.nombre);

    await addAudit('login', `Codigo de verificacion enviado a: ${emailLower}`, user, meta);

    res.json({
      requiresVerification: true,
      email: emailLower,
      message: 'Codigo de verificacion enviado al correo',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PASO 2: POST /api/auth/verify
 * Recibe email + codigo de 6 digitos, retorna tokens si es correcto
 */
async function verify(req, res, next) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email y codigo son requeridos' });
    }

    const emailLower = email.toLowerCase().trim();
    const meta = { ip: req.ip, userAgent: req.headers['user-agent'] };

    // Buscar codigo valido
    const verification = await prisma.verificationCode.findFirst({
      where: {
        email: emailLower,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verification) {
      await addAudit('security', `Verificacion fallida (sin codigo valido): ${emailLower}`, null, meta);
      return res.status(401).json({ error: 'Codigo expirado o invalido. Inicie sesion de nuevo.' });
    }

    // Verificar intentos maximos
    if (verification.attempts >= MAX_CODE_ATTEMPTS) {
      await prisma.verificationCode.update({
        where: { id: verification.id },
        data: { used: true },
      });
      await addAudit('security', `Verificacion bloqueada (max intentos): ${emailLower}`, null, meta);
      return res.status(429).json({ error: 'Demasiados intentos fallidos. Inicie sesion de nuevo.' });
    }

    // Verificar codigo
    if (verification.code !== code.trim()) {
      await prisma.verificationCode.update({
        where: { id: verification.id },
        data: { attempts: verification.attempts + 1 },
      });
      const remaining = MAX_CODE_ATTEMPTS - verification.attempts - 1;
      await addAudit('security', `Codigo incorrecto para: ${emailLower} (${remaining} intentos restantes)`, null, meta);
      return res.status(401).json({
        error: `Codigo incorrecto. ${remaining} intento(s) restante(s).`,
      });
    }

    // Codigo correcto - marcar como usado
    await prisma.verificationCode.update({
      where: { id: verification.id },
      data: { used: true },
    });

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: verification.userId },
      include: { estacion: true },
    });

    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    // Generar tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await addAudit('login', `Login exitoso (2FA): ${user.nombre} ${user.ap}`, user, meta);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        nombre: user.nombre,
        ap: user.ap,
        email: user.email,
        tipo: user.tipo,
        estacionId: user.estacionId,
        estacion: user.estacion ? {
          id: user.estacion.id,
          nombre: user.estacion.nombre,
          num: user.estacion.num,
        } : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/refresh
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token requerido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Refresh token invalido o expirado' });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token invalido o expirado' });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
    });
    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }

    if (req.user) {
      await addAudit('logout', `Cierre de sesion: ${req.user.nombre} ${req.user.ap}`, req.user);
    }

    res.json({ message: 'Sesion cerrada exitosamente' });
  } catch (err) {
    next(err);
  }
}

function incrementAttempts(email) {
  const current = loginAttempts.get(email) || { count: 0 };
  loginAttempts.set(email, {
    count: current.count + 1,
    lastAttempt: Date.now(),
  });
}

module.exports = { login, verify, refresh, logout };
