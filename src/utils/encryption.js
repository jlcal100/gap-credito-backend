const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) throw new Error('ENCRYPTION_KEY o JWT_SECRET requerido');
  // Derivar key de 32 bytes del secret
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encriptar un string sensible (cuenta bancaria, CLABE, etc.)
 * Retorna: iv:tag:encrypted en hex
 */
function encrypt(text) {
  if (!text) return text;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

/**
 * Desencriptar un string
 */
function decrypt(encryptedText) {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const key = getKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText; // Si falla, retornar tal cual (dato no encriptado)
  }
}

/**
 * Enmascarar cuenta bancaria: 0123456789 -> ****6789
 */
function maskAccount(account) {
  if (!account || account.length < 4) return '****';
  return '****' + account.slice(-4);
}

/**
 * Enmascarar CLABE: 012180001234567890 -> ************7890
 */
function maskClabe(clabe) {
  if (!clabe || clabe.length < 4) return '****';
  return '*'.repeat(clabe.length - 4) + clabe.slice(-4);
}

module.exports = { encrypt, decrypt, maskAccount, maskClabe };
