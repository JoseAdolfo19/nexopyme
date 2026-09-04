import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGO = "aes-256-gcm";

/**
 * Deriva una clave AES-256 de 32 bytes a partir de AUTH_SECRET.
 * Así, la clave de cifrado rota junto al secreto de sesión sin config extra.
 */
function encryptionKey(): Buffer {
  return createHash("sha256")
    .update(process.env.AUTH_SECRET ?? "dev-secret-change-me")
    .digest();
}

/** Cifra un valor sensible (contraseña/certificado) con AES-256-GCM. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["e", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

/**
 * Descifra un valor cifrado con `encryptSecret`. Si el valor no tiene el
 * prefijo esperado (p. ej. datos legados en texto plano) lo devuelve tal cual.
 */
export function decryptSecret(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "e") return payload; // no cifrado (legacy)
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Muestra el valor enmascarado para la UI, sin exponer el dato real. */
export function maskSecret(payload: string): string {
  if (!payload) return "";
  const plain = decryptSecret(payload);
  if (plain.length <= 4) return "••••";
  return `••••${plain.slice(-4)}`;
}