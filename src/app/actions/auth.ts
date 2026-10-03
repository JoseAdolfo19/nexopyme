"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/validations";
import { clearSession, getCurrentUser, setSession } from "@/lib/auth";
import { AUTH_RATE_LIMITS, assertSameOrigin, getClientIp, rateLimit } from "@/lib/security";
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

export async function registerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ip = await getClientIp();

  // Limitación de intentos de registro por IP (evita abuso/spam de cuentas).
  const reg = rateLimit(`register:${ip}`, AUTH_RATE_LIMITS.register);
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

  // Verificación de correo real: el usuario NO queda verificado automáticamente.
  // Se genera un token firmado y se envía por correo (Resend) o se registra en log.
  const token = await createEmailVerificationToken(user.id);
  const url = emailVerificationUrl(token);

  // El fallo del mailer no debe romper el registro: la cuenta ya existe y el
  // usuario debe llegar a la pantalla de pendiente (en desarrollo el enlace se
  // muestra allí). De lo contrario, la cuenta quedaría inaccesible: un
  // reintento respondería "Ya existe una cuenta con este correo".
  try {
    await sendVerificationEmail(user.email, url);
  } catch (error) {
    console.error("[register] No se pudo enviar el correo de verificación:", error);
  }

  await setSession({ userId: user.id });
  const devUrl = process.env.NODE_ENV !== "production" ? `&devUrl=${encodeURIComponent(url)}` : "";
  redirect(`/verify-email/pending?email=${encodeURIComponent(user.email)}${devUrl}`);
}

export async function resendVerificationAction(_prev: ActionResult): Promise<ActionResult> {
  void _prev;
  const user = await getCurrentUser();
  if (!user) return { error: "Tu sesión venció. Inicia sesión para reenviar el correo." };
  if (user.emailVerified) redirect("/dashboard");

  const ip = await getClientIp();
  const limit = rateLimit(`resend-verification:${user.id}:${ip}`, AUTH_RATE_LIMITS.register);
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
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ip = await getClientIp();

  // Validación básica previa para no consumir el rate limit con datos vacíos.
  const emailRaw = String(formData.get("email") ?? "").toLowerCase().trim();

  // Limitación de intentos de login por email+IP (brute force).
  const rl = rateLimit(`login:${emailRaw}:${ip}`, AUTH_RATE_LIMITS.login);
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

  // Si el usuario ya tiene negocios, entra al más reciente con ese negocio
  // activo en la sesión (requireBusiness exige businessId en la sesión y
  // de lo contrario redirigiría al onboarding una y otra vez).
  const membership = await prisma.businessUser.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (membership) {
    await setSession({ userId: user.id, businessId: membership.businessId });
    redirect("/dashboard");
  }

  await setSession({ userId: user.id });
  redirect("/onboarding");
}

export async function logoutAction(): Promise<void> {
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
  const ip = await getClientIp();
  const emailRaw = String(formData.get("email") ?? "").toLowerCase().trim();

  const rl = rateLimit(`reset-request:${emailRaw}:${ip}`, { limit: 5, windowMs: 10 * 60_000 });
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

  // El token se genera siempre que el usuario exista; el fallo del mailer no
  // debe impedir el flujo en desarrollo (mismo criterio que el registro).
  const token = await createPasswordResetToken(user.id);
  const url = passwordResetUrl(token);

  try {
    await sendPasswordResetEmail(user.email, url);
  } catch (error) {
    console.error("[password-reset] No se pudo enviar el correo:", error);
  }

  // En desarrollo no hay correo real accesible: devolvemos el enlace para
  // poder probar el flujo completo (mismo criterio que el registro).
  if (process.env.NODE_ENV !== "production") {
    return { ...generic, devUrl: url };
  }
  return generic;
}

/**
 * Paso 2: aplica la nueva contraseña con un token válido de 1 hora.
 */
export async function resetPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const ip = await getClientIp();
  const rl = rateLimit(`reset-apply:${ip}`, { limit: 10, windowMs: 15 * 60_000 });
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

  await audit({
    action: "auth.password_reset",
    userId: user.id,
    entityType: "User",
    entityId: user.id,
    newValues: { method: "reset-token" },
  });

  return { ok: true };
}