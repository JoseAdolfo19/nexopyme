import "server-only";

import { headers } from "next/headers";

/**
 * Utilidades de seguridad compartidas: rate limiting en memoria y
 * verificación de origen (CSRF, defensa en profundidad).
 *
 * NOTA: El rate limiter es en memoria (una sola instancia). Para entornos
 * multi-instancia o distribuidos debe sustituirse por un almacén compartido
 * (Redis, o tabla en BD). Para dev / etapa inicial es suficiente.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Limpia buckets caducados periódicamente para evitar fugas de memoria. */
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}, 60_000).unref?.();

/**
 * Aplica límite de intentos por clave. Devuelve `{ ok, retryAfterMs }`.
 * - key:  identificador único (p.ej. `login:email+ip`).
 * - limit: máx. intentos en la ventana.
 * - windowMs: duración de la ventana en milisegundos.
 */
export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  if (bucket.count >= opts.limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true, retryAfterMs: 0 };
}

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