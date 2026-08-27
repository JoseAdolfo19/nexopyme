"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema, registerSchema } from "@/lib/validations";
import { clearSession, setSession } from "@/lib/auth";

type ActionResult = { error?: string; ok?: boolean };

export async function registerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
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

  // En desarrollo la verificación de correo es automática (log-based mailer).
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  await setSession({ userId: user.id });
  redirect("/onboarding");
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
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

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  // MVP: sin tokens de correo reales. La verificación se marca automática
  // al registrar. Este endpoint queda preparado para el flujo real con email.
  const user = await prisma.user.findFirst({ where: { emailVerified: null } });
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });
  }
  return { ok: true };
}