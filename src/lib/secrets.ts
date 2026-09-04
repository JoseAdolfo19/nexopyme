import "server-only";

/**
 * Devuelve la clave secreta de la aplicación (AUTH_SECRET).
 * En producción es OBLIGATORIA y de longitud mínima: lanza error si falta,
 * evitando firmar sesiones con un secreto público por accidente.
 */
export function appSecretKey(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET no está definido o es demasiado corto (mínimo 16 caracteres).");
  }
  return "dev-secret-change-me";
}