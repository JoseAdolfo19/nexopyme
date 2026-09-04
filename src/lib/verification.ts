import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { appSecretKey } from "@/lib/secrets";

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

/** Mailer log-based (sin SMTP). Devuelve la URL para mostrarla en dev. */
export function sendVerificationEmail(email: string, url: string): string {
  // TODO: integrar un proveedor de correo (Resend, SendGrid, etc.).
  // Por ahora el "envío" queda registrado en consola/log.
  console.log(`[mailer:dev] Verificar correo de ${email}: ${url}`);
  return url;
}