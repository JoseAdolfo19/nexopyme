import "server-only";

import { PLAN_CATALOG, type PlanLimits } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const FREE_PLAN = PLAN_CATALOG[0];
const FISCAL_DOCUMENT_TYPES = ["boleta", "factura"];

function readLimits(value: unknown, fallback: PlanLimits): PlanLimits {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const limits = value as Record<string, unknown>;
  const read = (key: keyof PlanLimits) => {
    const candidate = limits[key];
    return typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 0
      ? candidate
      : fallback[key];
  };

  return {
    users: read("users"),
    documents: read("documents"),
    businesses: read("businesses"),
    branches: read("branches"),
  };
}

export async function getBusinessPlan(businessId: string) {
  const now = new Date();
  const subscription = await prisma.subscription.findFirst({
    where: {
      businessId,
      status: "activa",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      ],
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  const catalogPlan = PLAN_CATALOG.find((plan) => plan.code === subscription?.plan.code) ?? FREE_PLAN;
  const dbPlan = subscription?.plan;

  return {
    code: dbPlan?.code ?? FREE_PLAN.code,
    name: dbPlan?.name ?? FREE_PLAN.name,
    price: dbPlan ? Number(dbPlan.price) : FREE_PLAN.price,
    limits: readLimits(dbPlan?.limits, catalogPlan.limits),
    features: Array.isArray(dbPlan?.features)
      ? dbPlan.features.filter((feature): feature is string => typeof feature === "string")
      : [...catalogPlan.features],
  };
}

export async function countMonthlyFiscalDocuments(
  db: Pick<Prisma.TransactionClient, "document" | "sale">,
  businessId: string,
  now = new Date(),
) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [issued, reserved] = await Promise.all([
    db.document.count({
      where: {
        businessId,
        docType: { in: FISCAL_DOCUMENT_TYPES },
        issueDate: { gte: start, lt: nextMonth },
      },
    }),
    db.sale.count({
      where: {
        businessId,
        docType: { in: FISCAL_DOCUMENT_TYPES },
        createdAt: { gte: start, lt: nextMonth },
        documents: { none: { docType: { in: FISCAL_DOCUMENT_TYPES } } },
      },
    }),
  ]);

  return issued + reserved;
}