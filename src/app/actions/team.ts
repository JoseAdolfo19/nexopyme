"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getSession } from "@/lib/auth";
import { prisma, scope } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";

export type TeamActionResult = { error?: string; ok?: boolean };

function validRole(value: string): value is (typeof ROLES)[number]["value"] {
  return ROLES.some((role) => role.value === value);
}

async function getAdminContext() {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return null;

  const membership = await prisma.businessUser.findFirst({
    where: { businessId, userId: user.id, isActive: true },
    select: { role: true },
  });
  if (membership?.role !== "administrador") return null;

  return { user, businessId, db: scope(businessId) };
}

export async function saveTeamMemberAction(
  _prev: TeamActionResult,
  formData: FormData,
): Promise<TeamActionResult> {
  const context = await getAdminContext();
  if (!context) return { error: "Solo un administrador del negocio puede gestionar el equipo." };

  const operation = String(formData.get("operation") ?? "add");
  const userId = String(formData.get("user_id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  if (!validRole(role)) return { error: "Selecciona un rol válido." };

  if (operation === "remove") {
    if (!userId || userId === context.user.id) return { error: "No puedes retirar tu propio acceso." };
    await context.db.businessUser.update({
      where: { businessId_userId: { businessId: context.businessId, userId } },
      data: { isActive: false },
    });
  } else if (operation === "update") {
    if (!userId) return { error: "Usuario no válido." };
    await context.db.businessUser.update({
      where: { businessId_userId: { businessId: context.businessId, userId } },
      data: { role, isActive: true },
    });
  } else {
    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser || !invitedUser.isActive) {
      return { error: "No existe un usuario activo con ese correo. Primero debe crear su cuenta." };
    }
    await context.db.businessUser.upsert({
      where: { businessId_userId: { businessId: context.businessId, userId: invitedUser.id } },
      update: { role, isActive: true },
      create: { businessId: context.businessId, userId: invitedUser.id, role, isActive: true },
    });
  }

  revalidatePath("/configuracion");
  return { ok: true };
}
