const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { addAudit } = require('../utils/audit');

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_LOGIN_ATTEMPTS = 3;
const LOCK_DURATION_MS = 30 * 1000; // 30 segundos

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
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }

    const emailLower = email.toLowerCase().trim();

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
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      incrementAttempts(emailLower);
      return res.status(401).json({ error: 'Credenciales invalidas' });
    }

    // Reset attempts on success
    loginAttempts.delete(emailLower);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in DB
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Audit
    await addAudit('login', `Inicio de sesion: ${user.nombre} ${user.ap}`, user);

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

    // Verify token signature
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Refresh token invalido o expirado' });
    }

    // Check token exists in DB
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (!stored || stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token invalido o expirado' });
    }

    // Get user
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
    });
    if (!user || !user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    // Rotate: delete old, create new
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

module.exports = { login, refresh, logout };
