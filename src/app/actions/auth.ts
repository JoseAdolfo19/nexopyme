"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/validations";
import { bumpTokenVersion, clearSession, getCurrentUser, setSession } from "@/lib/auth";
import { assertSameOrigin, getClientIp, AUTH_RATE_LIMITS } from "@/lib/security";
import { checkRateLimit } from "@/lib/rateLimitDb";
import {
  createEmailVerificationToken,
  createPasswordResetToken,
  emailVerificationUrl,
  passwordResetUrl,
  sendPasswordResetEmail,
  sendVerificationEmail,
  verifyPasswordResetToken,
} from "@/lib/verification";
import { isEmailDeliveryConfigured } from "@/lib/mailer";
import { audit } from "@/lib/audit";

type ActionResult = { error?: string; ok?: boolean };

function isNextRedirectError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
  );
}

function unexpectedServerError(context: string, error: unknown, fallback: string): ActionResult {
  if (isNextRedirectError(error)) {
    throw error;
  }

  console.error(`[${context}] Error inesperado:`, error);
  return { error: fallback };
}

export async function registerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const ip = await getClientIp();

    // Limitación de intentos de registro por IP (evita abuso/spam de cuentas).
    const reg = await checkRateLimit(`register:${ip}`, AUTH_RATE_LIMITS.register);
    if (!reg.ok) {
      return { error: "Demasiados registros desde esta dirección. Intenta en un minuto." };
    }

    // Defensa CSRF: el origen debe coincidir con el host.
    try {
      await assertSameOrigin();
    } catch {
      return { error: "Solicitud no válida." };
    }

    const parsed = registerSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      passwordConfirm: formData.get("password_confirm"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return { error: "Ya existe una cuenta con este correo." };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email: email.toLowerCase(), passwordHash },
    });

    const token = await createEmailVerificationToken(user.id);
    const url = emailVerificationUrl(token);

    try {
      await sendVerificationEmail(user.email, url);
    } catch (error) {
      console.error("[register] No se pudo enviar el correo de verificación:", error);
    }

    await setSession({ userId: user.id, tokenVersion: user.tokenVersion });
    const devUrl = process.env.NODE_ENV !== "production" ? `&devUrl=${encodeURIComponent(url)}` : "";
    redirect(`/verify-email/pending?email=${encodeURIComponent(user.email)}${devUrl}`);
  } catch (error) {
    return unexpectedServerError("register", error, "No pudimos crear tu cuenta en este momento. Inténtalo de nuevo.");
  }
}

export async function resendVerificationAction(_prev: ActionResult): Promise<ActionResult> {
  void _prev;
  try {
    const user = await getCurrentUser();
    if (!user) return { error: "Tu sesión venció. Inicia sesión para reenviar el correo." };
    if (user.emailVerified) redirect("/dashboard");

    const ip = await getClientIp();
    const limit = await checkRateLimit(`resend-verification:${user.id}:${ip}`, AUTH_RATE_LIMITS.register);
    if (!limit.ok) return { error: "Espera un minuto antes de solicitar otro correo." };

    try {
      await assertSameOrigin();
    } catch {
      return { error: "Solicitud no válida." };
    }

    if (!isEmailDeliveryConfigured()) {
      return { error: "El envío de correo no está configurado en el servidor." };
    }

    try {
      const token = await createEmailVerificationToken(user.id);
      await sendVerificationEmail(user.email, emailVerificationUrl(token));
      return { ok: true };
    } catch (error) {
      console.error("[verification] No se pudo reenviar el correo:", error);
      return { error: "No se pudo enviar el correo. Inténtalo nuevamente." };
    }
  } catch (error) {
    return unexpectedServerError("resendVerification", error, "No pudimos reenviar tu correo. Inténtalo nuevamente.");
  }
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const ip = await getClientIp();

    // Validación básica previa para no consumir el rate limit con datos vacíos.
    const emailRaw = String(formData.get("email") ?? "").toLowerCase().trim();

    // Limitación de intentos de login por email+IP (brute force).
    const rl = await checkRateLimit(`login:${emailRaw}:${ip}`, AUTH_RATE_LIMITS.login);
    if (!rl.ok) {
      return { error: "Demasiados intentos. Intenta de nuevo en un momento." };
    }

    // Defensa CSRF: el origen debe coincidir con el host.
    try {
      await assertSameOrigin();
    } catch {
      return { error: "Solicitud no válida." };
    }

    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return { error: "Correo o contraseña incorrectos." };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return { error: "Correo o contraseña incorrectos." };
    }

    if (!user.isActive) {
      return { error: "Tu cuenta está desactivada. Contacta con soporte." };
    }

    const membership = await prisma.businessUser.findFirst({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (membership) {
      await setSession({ userId: user.id, businessId: membership.businessId, tokenVersion: user.tokenVersion });
      redirect("/dashboard");
    }

    // Superadministradores sin negocio propio van directo al panel global
    // en lugar de caer en el wizard de onboarding.
    await setSession({ userId: user.id, tokenVersion: user.tokenVersion });
    if (user.isSuperAdmin) redirect("/superadmin");
    redirect("/onboarding");
  } catch (error) {
    return unexpectedServerError("login", error, "No pudimos iniciar sesión en este momento. Inténtalo de nuevo.");
  }
}

export async function logoutAction(): Promise<void> {
  // Revoca TODAS las sesiones del usuario (el JWT de 7 días deja de servir);
  // luego limpia la cookie.
  try {
    const user = await getCurrentUser();
    if (user) await bumpTokenVersion(user.id);
  } catch (error) {
    console.error("[logout] No se pudo revocar la sesión:", error);
  }
  await clearSession();
  redirect("/login");
}

/** Wrapper de 1 argumento para usar directo en <form action> (login). */
export async function loginFormAction(formData: FormData): Promise<void> {
  await loginAction({}, formData);
}

/** Wrapper de 1 argumento para usar directo en <form action> (registro). */
export async function registerFormAction(formData: FormData): Promise<void> {
  await registerAction({}, formData);
}

// ==================== RECUPERACIÓN DE CONTRASEÑA ====================

export type PasswordResetResult = { error?: string; ok?: boolean; devUrl?: string };

/**
 * Paso 1: pide un correo y envía el enlace de recuperación.
 * La respuesta es SIEMPRE genérica para no revelar si el correo tiene cuenta.
 */
export async function requestPasswordResetAction(
  _prev: PasswordResetResult,
  formData: FormData,
): Promise<PasswordResetResult> {
  try {
    const ip = await getClientIp();
    const emailRaw = String(formData.get("email") ?? "").toLowerCase().trim();

    const rl = await checkRateLimit(`reset-request:${emailRaw}:${ip}`, { limit: 5, windowMs: 10 * 60_000 });
    if (!rl.ok) return { error: "Demasiadas solicitudes. Espera unos minutos antes de intentar de nuevo." };

    try {
      await assertSameOrigin();
    } catch {
      return { error: "Solicitud no válida." };
    }

    if (!/^\S+@\S+\.\S+$/.test(emailRaw)) {
      return { error: "Escribe un correo válido." };
    }

    const generic: PasswordResetResult = { ok: true };

    const user = await prisma.user.findUnique({ where: { email: emailRaw } });
    if (!user || !user.isActive) return generic;

    const token = await createPasswordResetToken(user.id);
    const url = passwordResetUrl(token);

    try {
      await sendPasswordResetEmail(user.email, url);
    } catch (error) {
      console.error("[password-reset] No se pudo enviar el correo:", error);
    }

    if (process.env.NODE_ENV !== "production") {
      return { ...generic, devUrl: url };
    }
    return generic;
  } catch (error) {
    return unexpectedServerError("requestPasswordReset", error, "No pudimos procesar tu solicitud. Inténtalo nuevamente.");
  }
}

/**
 * Paso 2: aplica la nueva contraseña con un token válido de 1 hora.
 */
export async function resetPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ip = await getClientIp();
    const rl = await checkRateLimit(`reset-apply:${ip}`, { limit: 10, windowMs: 15 * 60_000 });
    if (!rl.ok) return { error: "Demasiados intentos. Espera unos minutos." };

    try {
      await assertSameOrigin();
    } catch {
      return { error: "Solicitud no válida." };
    }

    const token = String(formData.get("token") ?? "");
    const password = String(formData.get("new_password") ?? "");
    const passwordConfirm = String(formData.get("password_confirm") ?? "");

    if (password.length < 8) return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
    if (password !== passwordConfirm) return { error: "Las contraseñas no coinciden." };

    const payload = await verifyPasswordResetToken(token);
    if (!payload) {
      return { error: "El enlace de recuperación no es válido o expiró. Solicita uno nuevo." };
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) return { error: "La cuenta no existe o está desactivada." };

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    // Revoca todas las sesiones activas: la contraseña cambió y los JWT
    // emitidos con la versión anterior no deben seguir sirviendo.
    await bumpTokenVersion(user.id);

    await audit({
      action: "auth.password_reset",
      userId: user.id,
      entityType: "User",
      entityId: user.id,
      newValues: { method: "reset-token" },
    });

    return { ok: true };
  } catch (error) {
    return unexpectedServerError("resetPassword", error, "No pudimos actualizar tu contraseña. Inténtalo nuevamente.");
  }
}