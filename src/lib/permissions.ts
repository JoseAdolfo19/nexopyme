import "server-only";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, getSession } from "@/lib/auth";
import type { BusinessRole } from "@/lib/constants";

/** Mensaje estándar cuando el rol del usuario no autoriza la acción. */
export const FORBIDDEN_ROLE = "No tienes permiso para realizar esta acción en este negocio.";

export type RoleContext = {
  user: { id: string; name: string; email: string };
  businessId: string;
  role: BusinessRole;
};

/**
 * Devuelve el rol activo del usuario dentro del negocio indicado
 * (o null si no es miembro activo). Una sola consulta.
 */
export async function getRoleInBusiness(
  userId: string,
  businessId: string,
): Promise<BusinessRole | null> {
  const membership = await prisma.businessUser.findFirst({
    where: { businessId, userId, isActive: true },
    select: { role: true },
  });
  return (membership?.role as BusinessRole) ?? null;
}

/**
 * Guard de roles para server actions: verifica sesión activa, negocio en
 * sesión y que el rol del usuario esté entre los permitidos.
 * Devuelve el contexto ({ user, businessId, role }) o null si no autoriza.
 *
 * Ejemplo:
 *   const ctx = await requireRole(["administrador", "almacen"]);
 *   if (!ctx) return { error: FORBIDDEN_ROLE };
 */
export async function requireRole(allowed: readonly BusinessRole[]): Promise<RoleContext | null> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return null;

  const role = await getRoleInBusiness(user.id, businessId);
  if (!role || !allowed.includes(role)) return null;

  return { user, businessId, role };
}
