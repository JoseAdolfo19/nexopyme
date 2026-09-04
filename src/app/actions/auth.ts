"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/validations";
import { clearSession, setSession } from "@/lib/auth";
import { AUTH_RATE_LIMITS, assertSameOrigin, getClientIp, rateLimit } from "@/lib/security";
import { createEmailVerificationToken, emailVerificationUrl, sendVerificationEmail } from "@/lib/verification";

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
  // Se genera un token firmado y se "envía" (mailer log-based; sin SMTP aún).
  const token = await createEmailVerificationToken(user.id);
  const url = emailVerificationUrl(token);
  sendVerificationEmail(user.email, url);

  await setSession({ userId: user.id });
  const devUrl = process.env.NODE_ENV !== "production" ? `&devUrl=${encodeURIComponent(url)}` : "";
  redirect(`/verify-email/pending?email=${encodeURIComponent(user.email)}${devUrl}`);
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

  await setSession({ userId: user.id });

  // Si el usuario ya tiene negocios, entra al más reciente.
  const membership = await prisma.businessUser.findFirst({
    where: { userId: user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (membership) {
    redirect("/dashboard");
  }
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