import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PLAN_CATALOG } from "../src/lib/constants";
import { createDb } from "../scripts/db";

const prisma: PrismaClient = createDb();

async function main() {
  for (const plan of PLAN_CATALOG) {
    await prisma.plan.upsert({
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
  }
  console.log(`✅ Seed: ${PLAN_CATALOG.length} planes creados/actualizados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());