import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "nexopyme_session";
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 días

const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-secret-change-me");

export type SessionPayload = {
  userId: string;
  businessId?: string;
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

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user || !user.isActive) return null;

  return user;
});

/** Requiere sesión; redirige a /login si no la hay. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Requiere sesión Y un negocio activo en sesión; redirige a onboarding si falta. */
export async function requireBusiness() {
  const user = await requireUser();
  const session = await getSession();

  const businessId = session?.businessId;
  if (!businessId) redirect("/onboarding");

  const business = await prisma.business.findFirst({
    where: {
      id: businessId,
      users: { some: { userId: user.id, isActive: true } },
    },
    include: { users: true },
  });

  if (!business) redirect("/onboarding");

  return { user, business };
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

/** Cambia el negocio activo (multi-empresa). */
export async function switchBusiness(businessId: string) {
  const user = await getCurrentUser();
  if (!user) return false;

  const membership = await prisma.businessUser.findFirst({
    where: { userId: user.id, businessId, isActive: true },
  });
  if (!membership) return false;

  const session = await getSession();
  await setSession({ ...(session ?? {}), userId: user.id, businessId });
  return true;
}