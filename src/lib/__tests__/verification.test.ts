import { describe, it, expect, beforeEach, vi } from "vitest";

import {
  createEmailVerificationToken,
  verifyEmailToken,
  emailVerificationUrl,
} from "@/lib/verification";

// Garantiza secreto de desarrollo (NODE_ENV !== production en tests).
beforeEach(() => {
  delete process.env.AUTH_SECRET;
});

describe("token de verificación de correo", () => {
  it("genera un token firmado que verifica correctamente", async () => {
    const token = await createEmailVerificationToken("user_123");
    expect(token).toBeTruthy();

    const payload = await verifyEmailToken(token);
    expect(payload).toEqual({ purpose: "verify-email", userId: "user_123" });
  });

  it("devuelve null para un token inválido o manipulado", async () => {
    const token = await createEmailVerificationToken("user_123");
    const tampered = token.slice(0, -4) + "AAAA";

    await expect(verifyEmailToken(tampered)).resolves.toBeNull();
    await expect(verifyEmailToken("no-es-un-token")).resolves.toBeNull();
    await expect(verifyEmailToken("")).resolves.toBeNull();
  });

  it("rechaza tokens con propósito distinto a verify-email", async () => {
    // Firmamos un token con el mismo secreto pero otro propósito.
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode("dev-secret-change-me");
    const otherToken = await new SignJWT({ purpose: "reset-password", userId: "u1" })
      .setProtectedHeader({ alg: "HS256" })
      .sign(secret);

    await expect(verifyEmailToken(otherToken)).resolves.toBeNull();
  });

  it("construye la URL pública de verificación con el token", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://nexopyme.app");
    const url = emailVerificationUrl("abc%def");
    expect(url).toContain("https://nexopyme.app/verify-email");
    expect(url).toContain(encodeURIComponent("abc%def"));
  });
});