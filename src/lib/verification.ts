import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { appSecretKey } from "@/lib/secrets";
import { sendEmail } from "@/lib/mailer";

const SECRET = () => new TextEncoder().encode(appSecretKey());
const VERIFY_TTL = 60 * 60 * 24; // 24 horas

export type VerifyTokenPayload = { purpose: "verify-email"; userId: string };

/**
 * Crea un token firmado de verificación de correo.
 * En un flujo real el token viajaría por email; al no haber servicio de
 * correo configurado, se registra en el log (log-based mailer) y en dev se
 * muestra el enlace en la pantalla de pendiente.
 */
export async function createEmailVerificationToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: "verify-email", userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${VERIFY_TTL}s`)
    .sign(SECRET());
}

/** Verifica el token y devuelve el payload si es válido para el fin de correo. */
export async function verifyEmailToken(token: string): Promise<VerifyTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET());
    if (payload.purpose !== "verify-email" || typeof payload.userId !== "string") {
      return null;
    }
    return { purpose: "verify-email", userId: payload.userId };
  } catch {
    return null;
  }
}

/** URL pública de verificación a partir de un token. */
export function emailVerificationUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

/** Plantilla HTML del correo de verificación. */
export function verificationEmailHtml(url: string): string {
  return `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" maxwidth="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7e5e4;">
            <tr>
              <td style="background:#0f766e;padding:28px 32px;text-align:center;">
                <span style="color:#ffffff;font-size:22px;font-weight:bold;">Tienda Plus</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;color:#171717;font-size:20px;">Confirma tu correo</h1>
                <p style="margin:0 0 20px;color:#525252;font-size:15px;line-height:1.6;">
                  Hola, gracias por registrarte en Tienda Plus. Para activar tu cuenta y empezar a
                  gestionar tu negocio, confirma tu dirección de correo con el siguiente botón:
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    <td style="background:#0f766e;border-radius:10px;">
                      <a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">Verificar correo</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;color:#a3a3a3;font-size:12px;line-height:1.6;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
                  <a href="${url}" style="color:#0f766e;word-break:break-all;">${url}</a><br/><br/>
                  Este enlace es válido por 24 horas. Si no solicitaste esta cuenta, ignora este correo.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Envía el correo de verificación. En producción usa Resend; si no hay
 * RESEND_API_KEY configurada, lo registra en consola (mailer dev).
 */
export async function sendVerificationEmail(email: string, url: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Confirma tu correo — Tienda Plus",
    html: verificationEmailHtml(url),
    text: `Confirma tu correo de Tienda Plus abriendo este enlace: ${url}\n\nSi no creaste esta cuenta, ignora este correo.`,
  });
}

// ==================== RECUPERACIÓN DE CONTRASEÑA ====================

const RESET_TTL = 60 * 60; // 1 hora

export type ResetTokenPayload = { purpose: "reset-password"; userId: string };

/** Crea un token firmado de recuperación de contraseña (válido 1 hora). */
export async function createPasswordResetToken(userId: string): Promise<string> {
  return new SignJWT({ purpose: "reset-password", userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${RESET_TTL}s`)
    .sign(SECRET());
}

/** Verifica el token de recuperación y devuelve el userId si es válido. */
export async function verifyPasswordResetToken(token: string): Promise<ResetTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET());
    if (payload.purpose !== "reset-password" || typeof payload.userId !== "string") {
      return null;
    }
    return { purpose: "reset-password", userId: payload.userId };
  } catch {
    return null;
  }
}

/** URL pública de restablecimiento a partir de un token. */
export function passwordResetUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/restablecer-password?token=${encodeURIComponent(token)}`;
}

/** Envía el correo de recuperación de contraseña. */
export async function sendPasswordResetEmail(email: string, url: string): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Recupera tu contraseña — Tienda Plus",
    html: `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e7e5e4;">
            <tr>
              <td style="background:#0f766e;padding:28px 32px;text-align:center;">
                <span style="color:#ffffff;font-size:22px;font-weight:bold;">Tienda Plus</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;color:#171717;font-size:20px;">Recupera tu contraseña</h1>
                <p style="margin:0 0 20px;color:#525252;font-size:15px;line-height:1.6;">
                  Recibimos una solicitud para restablecer la contraseña de tu cuenta.
                  Haz clic en el siguiente botón para elegir una nueva (el enlace expira en 1 hora):
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                  <tr>
                    <td style="background:#0f766e;border-radius:10px;">
                      <a href="${url}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">Restablecer contraseña</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0;color:#a3a3a3;font-size:12px;line-height:1.6;">
                  Si el botón no funciona, copia y pega este enlace:<br/>
                  <a href="${url}" style="color:#0f766e;word-break:break-all;">${url}</a><br/><br/>
                  Si no solicitaste este cambio, ignora este correo: tu contraseña seguirá igual.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: `Restablece tu contraseña de Tienda Plus abriendo este enlace (válido 1 hora): ${url}\n\nSi no lo solicitaste, ignora este correo.`,
  });
}