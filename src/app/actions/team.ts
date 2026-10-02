"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getSession } from "@/lib/auth";
import { prisma, scope } from "@/lib/prisma";
import { ROLES } from "@/lib/constants";
import { getBusinessPlan } from "@/lib/plans";

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
    const existingMembership = await context.db.businessUser.findUnique({
      where: { businessId_userId: { businessId: context.businessId, userId } },
      select: { isActive: true },
    });
    if (!existingMembership) return { error: "El usuario no pertenece a este negocio." };

    if (existingMembership.isActive) {
      await context.db.businessUser.update({
        where: { businessId_userId: { businessId: context.businessId, userId } },
        data: { role },
      });
    } else {
      const plan = await getBusinessPlan(context.businessId);
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${context.businessId} FOR UPDATE`;
        const activeUsers = await tx.businessUser.count({
          where: { businessId: context.businessId, isActive: true },
        });
        if (plan.limits.users !== null && activeUsers >= plan.limits.users) {
          return { error: `Tu plan ${plan.name} permite hasta ${plan.limits.users} usuario(s).` };
        }
        await tx.businessUser.update({
          where: { businessId_userId: { businessId: context.businessId, userId } },
          data: { role, isActive: true },
        });
        return { ok: true };
      });
      if (result.error) return result;
    }
  } else {
    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser || !invitedUser.isActive) {
      return { error: "No existe un usuario activo con ese correo. Primero debe crear su cuenta." };
    }
    const existingMembership = await context.db.businessUser.findUnique({
      where: { businessId_userId: { businessId: context.businessId, userId: invitedUser.id } },
      select: { isActive: true },
    });

    if (existingMembership?.isActive) {
      await context.db.businessUser.update({
        where: { businessId_userId: { businessId: context.businessId, userId: invitedUser.id } },
        data: { role },
      });
    } else {
      const plan = await getBusinessPlan(context.businessId);
      const result = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${context.businessId} FOR UPDATE`;
        const activeUsers = await tx.businessUser.count({
          where: { businessId: context.businessId, isActive: true },
        });
        if (plan.limits.users !== null && activeUsers >= plan.limits.users) {
          return { error: `Tu plan ${plan.name} permite hasta ${plan.limits.users} usuario(s).` };
        }
        await tx.businessUser.upsert({
          where: { businessId_userId: { businessId: context.businessId, userId: invitedUser.id } },
          update: { role, isActive: true },
          create: { businessId: context.businessId, userId: invitedUser.id, role, isActive: true },
        });
        return { ok: true };
      });
      if (result.error) return result;
    }
  }

  revalidatePath("/configuracion");
  return { ok: true };
}
