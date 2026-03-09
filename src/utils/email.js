const { Resend } = require('resend');

let resend = null;

function getResend() {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY no configurada - emails deshabilitados');
      return null;
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Genera un codigo aleatorio de 6 digitos
 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Envia codigo de verificacion por email
 * @param {string} to - Email destino
 * @param {string} code - Codigo de 6 digitos
 * @param {string} userName - Nombre del usuario
 */
async function sendVerificationCode(to, code, userName) {
  const client = getResend();

  if (!client) {
    console.log(`[EMAIL MOCK] Codigo para ${to}: ${code}`);
    return { success: true, mock: true };
  }

  const fromEmail = process.env.RESEND_FROM || 'GAP Credito <noreply@resend.dev>';

  try {
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: `${code} - Codigo de verificacion GAP Credito`,
      html: `
        <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8f9fa;border-radius:12px">
          <div style="text-align:center;margin-bottom:24px">
            <div style="background:#151D33;color:#fff;display:inline-block;padding:12px 24px;border-radius:8px;font-size:18px;font-weight:700">
              GAP Corporativo
            </div>
          </div>
          <div style="background:#fff;padding:32px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
            <p style="color:#333;font-size:15px;margin:0 0 8px">Hola <strong>${userName}</strong>,</p>
            <p style="color:#666;font-size:14px;margin:0 0 24px">Tu codigo de verificacion para iniciar sesion es:</p>
            <div style="text-align:center;margin:24px 0">
              <span style="font-family:'JetBrains Mono',monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#151D33;background:#f0f1f3;padding:16px 32px;border-radius:8px;display:inline-block">
                ${code}
              </span>
            </div>
            <p style="color:#999;font-size:12px;text-align:center;margin:24px 0 0">
              Este codigo expira en <strong>5 minutos</strong>.<br>
              Si no solicitaste este codigo, ignora este mensaje.
            </p>
          </div>
          <p style="color:#bbb;font-size:11px;text-align:center;margin:16px 0 0">
            GAP Corporativo - Gestion de Credito por Estacion
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Error enviando email:', error);
      return { success: false, error: error.message };
    }

    console.log(`[EMAIL] Codigo enviado a ${to} (id: ${data?.id})`);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Error enviando email:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { generateCode, sendVerificationCode };
