import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { appSecretKey } from "@/lib/secrets";

export const SESSION_COOKIE = "tiendaplus_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 días

const secret = () => new TextEncoder().encode(appSecretKey());

export type SessionPayload = {
  userId: string;
  businessId?: string;
  /** Versión del token: bump en logout/cambio de contraseña invalida sesiones. */
  tokenVersion?: number;
  [key: string]: unknown;
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/** Lee y valida la sesión actual (server component). Cacheada por request. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
});

/** Devuelve el usuario autenticado completo o null. */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user || !user.isActive) return null;

    // Revocación de sesiones: la versión del token debe coincidir con la BD.
    // logout() y el cambio de contraseña hacen bump → todos los JWT emitidos
    // con la versión anterior dejan de servir inmediatamente.
    if (session.tokenVersion !== user.tokenVersion) return null;

    return user;
  } catch (error) {
    console.error("[auth] No se pudo cargar el usuario actual:", error);
    return null;
  }
});

/** Invalida TODAS las sesiones activas del usuario (logout, reset de contraseña). */
export async function bumpTokenVersion(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

/** Requiere sesión; redirige a /login si no la hay. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // El correo debe estar verificado antes de usar la plataforma.
  // En dev, sin proveedor de correo, el enlace se muestra en la pantalla
  // de pendiente y en el log del servidor.
  if (!user.emailVerified) {
    redirect(`/verify-email/pending?email=${encodeURIComponent(user.email)}`);
  }

  return user;
}

/** Requiere sesión Y un negocio activo en sesión; redirige a onboarding si falta. */
export async function requireBusiness() {
  const user = await requireUser();
  const session = await getSession();

  const businessId = session?.businessId;
  if (!businessId) redirect("/onboarding");

  try {
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        users: { some: { userId: user.id, isActive: true } },
      },
      include: { users: true },
    });

    if (!business) redirect("/onboarding");

    return { user, business };
  } catch (error) {
    console.error("[auth] No se pudo cargar el negocio activo:", error);
    redirect("/login");
  }
}

/** Requiere una cuenta global de soporte, independiente del negocio activo. */
export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!user.isSuperAdmin) redirect("/dashboard");
  return user;
}

export async function setSession(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * En este producto cada usuario tiene un perfil propio y no debe alternar
 * entre negocios desde la sesión. Se bloquea para evitar cambios accidentales.
 */
export async function switchBusiness(businessId: string) {
  void businessId;
  const user = await getCurrentUser();
  if (!user) return false;

  console.warn("[auth] Cambio de negocio bloqueado: el usuario no puede alternar negocios en este perfil.");
  return false;
}