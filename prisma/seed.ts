import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { buildConnectionConfig } from "../src/lib/dbConfig";

const adapter = new PrismaMariaDb(buildConnectionConfig());
const prisma = new PrismaClient({ adapter });

const plans = [
  {
    code: "free",
    name: "Free",
    price: 0,
    limits: { users: 1, documents: 50, businesses: 1, branches: 1 },
    features: ["1 usuario", "Clientes", "Productos", "Ventas", "Funciones básicas", "Límite de comprobantes"],
  },
  {
    code: "emprendedor",
    name: "Emprendedor",
    price: 19.9,
    limits: { users: 3, documents: 500, businesses: 1, branches: 1 },
    features: ["Más comprobantes", "Inventario", "Reportes", "Catálogo", "Más usuarios", "WhatsApp"],
  },
  {
    code: "negocio",
    name: "Negocio",
    price: 39.9,
    limits: { users: 10, documents: 5000, businesses: 1, branches: 3 },
    features: ["Usuarios", "Caja", "Compras", "Proveedores", "Reportes avanzados", "Inventario avanzado"],
  },
  {
    code: "pro",
    name: "Pro",
    price: 69.9,
    limits: { users: 50, documents: 50000, businesses: 5, branches: 20 },
    features: ["Multiempresa", "Multisucursal", "IA", "API", "Reportes avanzados", "Funciones premium"],
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: { ...plan, limits: plan.limits },
      create: { ...plan, limits: plan.limits },
    });
  }
  console.log(`✅ Seed: ${plans.length} planes creados/actualizados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());