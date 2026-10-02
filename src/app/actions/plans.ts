"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth";
import { PLAN_CATALOG } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

type PlanAssignmentResult = { error?: string; ok?: boolean };

export async function assignBusinessPlanAction(
  _previous: PlanAssignmentResult,
  formData: FormData,
): Promise<PlanAssignmentResult> {
  const admin = await requireSuperAdmin();
  const businessId = String(formData.get("business_id") ?? "");
  const planCode = String(formData.get("plan_code") ?? "");
  const plan = PLAN_CATALOG.find((item) => item.code === planCode);
  if (!businessId || businessId.length > 64 || !plan) {
    return { error: "Empresa o plan no válido." };
  }
  if (plan.price > 0 && formData.get("payment_confirmed") !== "yes") {
    return { error: "Confirma el cobro manual antes de activar este plan." };
  }
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
  if (!business) return { error: "La empresa no existe." };

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${businessId} FOR UPDATE`;

    const dbPlan = await tx.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        price: plan.price,
        limits: { ...plan.limits },
        features: [...plan.features],
        isActive: true,
      },
      create: {
        code: plan.code,
        name: plan.name,
        price: plan.price,
        limits: { ...plan.limits },
        features: [...plan.features],
      },
    });

    await tx.subscription.updateMany({
      where: { businessId, status: "activa" },
      data: { status: "cancelada", endsAt: new Date() },
    });
    await tx.subscription.create({
      data: { businessId, planId: dbPlan.id, status: "activa", startsAt: new Date() },
    });
  });

  await audit({
    action: "subscription.manual_assign",
    userId: admin.id,
    businessId,
    entityType: "Subscription",
    newValues: { planCode: plan.code, price: plan.price, manualPaymentConfirmed: plan.price > 0 },
  });

  revalidatePath("/superadmin");
  revalidatePath("/configuracion");
  return { ok: true };
}