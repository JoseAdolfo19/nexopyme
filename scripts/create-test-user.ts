import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { modulesForType } from "../src/lib/constants";
import bcrypt from "bcryptjs";

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "pruebas@nexopyme.test";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? randomBytes(12).toString("base64url");
const TEST_BUSINESS_SLUG = "negocio-pruebas";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: TEST_EMAIL },
    update: {
      name: "Usuario de Pruebas",
      passwordHash,
      emailVerified: new Date(),
      isActive: true,
    },
    create: {
      name: "Usuario de Pruebas",
      email: TEST_EMAIL,
      passwordHash,
      emailVerified: new Date(),
      isActive: true,
    },
  });

  const business = await prisma.$transaction(async (tx) => {
    const existingBusiness = await tx.business.findFirst({
      where: { ownerId: user.id, slug: TEST_BUSINESS_SLUG },
    });

    const demoBusiness = existingBusiness ?? (await tx.business.create({
      data: {
        ownerId: user.id,
        name: "Negocio de Pruebas",
        slug: TEST_BUSINESS_SLUG,
        businessType: "tienda",
        modules: modulesForType("tienda"),
        status: "activo",
      },
    }));

    await tx.businessUser.upsert({
      where: { businessId_userId: { businessId: demoBusiness.id, userId: user.id } },
      update: { role: "administrador", isActive: true },
      create: { businessId: demoBusiness.id, userId: user.id, role: "administrador", isActive: true },
    });

    const branch = await tx.branch.findFirst({ where: { businessId: demoBusiness.id, isMain: true } });
    if (!branch) {
      await tx.branch.create({
        data: { businessId: demoBusiness.id, name: "Principal", isMain: true, status: "activo" },
      });
    }

    const plan = await tx.plan.upsert({
      where: { code: "free" },
      update: {},
      create: {
        code: "free",
        name: "Free",
        price: 0,
        limits: { users: 1, documents: 50, businesses: 1, branches: 1 },
        features: ["Funciones básicas"],
      },
    });

    const subscription = await tx.subscription.findFirst({ where: { businessId: demoBusiness.id } });
    if (!subscription) {
      await tx.subscription.create({
        data: { businessId: demoBusiness.id, planId: plan.id, status: "activa", startsAt: new Date() },
      });
    }

    return demoBusiness;
  });

  console.log("\n✅ Usuario de pruebas listo");
  console.log(`Correo: ${user.email}`);
  console.log(`Contraseña: ${TEST_PASSWORD}`);
  console.log(`Negocio: ${business.name}`);
  console.log("Cuenta verificada: sí");
}

main()
  .catch((error) => {
    console.error("❌ No se pudo crear el usuario de pruebas:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });