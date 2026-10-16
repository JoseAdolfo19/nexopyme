import "server-only";

import { headers } from "next/headers";

/**
 * Utilidades de seguridad compartidas: verificación de origen (CSRF, defensa
 * en profundidad) y límites de los flujos de autenticación.
 *
 * El rate limiting vive en rateLimitDb.ts (persistente en BD, apto para
 * entornos multi-instancia como Vercel).
 */

/** Devuelve la IP del cliente (con fallback a "local" en dev). */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0].trim();
    const real = h.get("x-real-ip");
    if (real) return real.trim();
    return "local";
  } catch {
    return "local";
  }
}

/**
 * Verifica que el origen de la petición coincida con el host (defensa CSRF
 * adicional a la validación de origen que ya hace Next.js en server actions).
 * Lanza un error si hay discrepancia.
 */
export async function assertSameOrigin(): Promise<void> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("host");
  if (!origin) return; // peticiones sin Origin (p.ej. herramientas) no aplican
  if (!host) return;
  try {
    const originHost = new URL(origin).host;
    if (originHost !== host) {
      throw new Error("Origen no válido.");
    }
  } catch {
    throw new Error("Origen no válido.");
  }
}

/** Ventanas y límites por defecto. */
export const AUTH_RATE_LIMITS = {
  login: { limit: 8, windowMs: 60_000 }, // 8 intentos/min por email+IP
  register: { limit: 5, windowMs: 60_000 }, // 5 registros/min por IP
} as const;