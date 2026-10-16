import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Rate limiting persistente en base de datos.
 *
 * A diferencia del limiter en memoria (security.ts), este funciona en entornos
 * multi-instancia como Vercel, donde cada invocación serverless puede arrancar
 * en un proceso distinto. La cuenta vive en la tabla `rate_limit_hits`
 * (clave → hits → expiración), dialecto-agnóstica vía Prisma.
 *
 * Diseño "fail-open": si la BD no responde, se permite la petición y se
 * registra el error (la app no se bloquea por el limitador).
 */
export async function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<{ ok: boolean; retryAfterMs: number }> {
  // La clave es PK VARCHAR(191): recortar para no fallar por longitud.
  const safeKey = key.slice(0, 190);
  const now = Date.now();
  const expiresAt = new Date(now + opts.windowMs);

  try {
    const existing = await prisma.rateLimitHit.findUnique({ where: { key: safeKey } });

    if (!existing || existing.expiresAt.getTime() <= now) {
      // Ventana nueva: reinicia el contador.
      await prisma.rateLimitHit.upsert({
        where: { key: safeKey },
        update: { hits: 1, expiresAt },
        create: { key: safeKey, hits: 1, expiresAt },
      });
      return { ok: true, retryAfterMs: 0 };
    }

    const hits = existing.hits + 1;
    await prisma.rateLimitHit.update({
      where: { key: safeKey },
      data: { hits },
    });

    return {
      ok: hits <= opts.limit,
      retryAfterMs: existing.expiresAt.getTime() - now,
    };
  } catch (error) {
    console.error("[rate-limit] Fallo de BD; permitiendo la petición:", error);
    return { ok: true, retryAfterMs: 0 };
  }
}
