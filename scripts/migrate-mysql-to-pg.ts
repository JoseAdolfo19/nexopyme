/**
 * Migración de datos: MySQL local (tiendaplus) → PostgreSQL (Prisma Postgres).
 * Lee con el driver mariadb desde MYSQL_URL y escribe con Prisma en DATABASE_URL.
 * Conserva los IDs originales (cuid) para no romper las relaciones.
 */
import "dotenv/config";
import mariadb from "mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { createDb } from "./db";

const MYSQL_URL = process.env.MYSQL_URL ?? "mysql://root@127.0.0.1:3306/tiendaplus";

const url = new URL(MYSQL_URL);
const mysqlConfig = {
  host: url.hostname || "127.0.0.1",
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username || "root"),
  password: decodeURIComponent(url.password || ""),
  database: (url.pathname ?? "").replace(/^\/+/, "") || "tiendaplus",
  connectionLimit: 4,
};

const prisma: PrismaClient = createDb();

/** Columnas booleanas (el driver devuelve 0/1 para TINYINT(1)). */
const BOOLEAN_FIELDS = new Set([
  "isActive", "isMain", "isSuperAdmin", "isContingency", "trackStock",
]);

/** Columnas Json: el driver mariadb puede devolverlas como string. */
const JSON_FIELDS = new Set([
  "modules", "settings", "limits", "features", "oldValues", "newValues", "attributes",
]);

type Row = Record<string, unknown>;

function sanitize(row: Row): Row {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (BOOLEAN_FIELDS.has(key)) {
      out[key] = value === 1 || value === true;
    } else if (JSON_FIELDS.has(key) && typeof value === "string" && /^[[{]/.test(value)) {
      out[key] = JSON.parse(value);
    } else {
      out[key] = value;
    }
  }
  // `updatedAt` es obligatoria en el esquema (si el modelo la tiene); filas
  // insertadas por SQL directo pueden tenerla en NULL — se rellena con
  // createdAt (o ahora).
  if ("updatedAt" in row && (row.updatedAt === null || row.updatedAt === undefined)) {
    out.updatedAt = out.createdAt ?? new Date();
  }
  return out;
}

async function readAll(conn: mariadb.Connection, table: string): Promise<Row[]> {
  const rows = await conn.query(`SELECT * FROM \`${table}\``);
  return (rows as Row[]).map(sanitize);
}

async function main() {
  const conn = await mariadb.createConnection(mysqlConfig);
  console.log("Conectado a MySQL local:", mysqlConfig.database);

  const [
    users, businesses, businessUser, branches, categories, products,
    customers, suppliers, sales, saleItems, payments, inventoryMovements,
    documents, sunatSubmissions, sunatResponses, cashRegisters, cashMovements,
    subscriptions, auditLogs, mysqlPlans,
  ] = await Promise.all([
    readAll(conn, "users"),
    readAll(conn, "businesses"),
    readAll(conn, "business_user"),
    readAll(conn, "branches"),
    readAll(conn, "categories"),
    readAll(conn, "products"),
    readAll(conn, "customers"),
    readAll(conn, "suppliers"),
    readAll(conn, "sales"),
    readAll(conn, "sale_items"),
    readAll(conn, "payments"),
    readAll(conn, "inventory_movements"),
    readAll(conn, "documents"),
    readAll(conn, "sunat_submissions"),
    readAll(conn, "sunat_responses"),
    readAll(conn, "cash_registers"),
    readAll(conn, "cash_movements"),
    readAll(conn, "subscriptions"),
    readAll(conn, "audit_logs"),
    readAll(conn, "plans"),
  ]);
  await conn.end();

  console.log("Leído de MySQL:", {
    users: users.length, businesses: businesses.length, products: products.length,
    customers: customers.length, sales: sales.length, documents: documents.length,
  });

  // Insertar en PG en orden de dependencias, conservando IDs.
  await prisma.user.createMany({ data: users as never, skipDuplicates: true });
  await prisma.business.createMany({ data: businesses as never, skipDuplicates: true });
  await prisma.businessUser.createMany({ data: businessUser as never, skipDuplicates: true });
  await prisma.branch.createMany({ data: branches as never, skipDuplicates: true });
  await prisma.category.createMany({ data: categories as never, skipDuplicates: true });
  await prisma.product.createMany({ data: products as never, skipDuplicates: true });
  await prisma.customer.createMany({ data: customers as never, skipDuplicates: true });
  if (suppliers.length) await prisma.supplier.createMany({ data: suppliers as never, skipDuplicates: true });
  await prisma.sale.createMany({ data: sales as never, skipDuplicates: true });
  await prisma.saleItem.createMany({ data: saleItems as never, skipDuplicates: true });
  await prisma.payment.createMany({ data: payments as never, skipDuplicates: true });
  await prisma.inventoryMovement.createMany({ data: inventoryMovements as never, skipDuplicates: true });
  await prisma.document.createMany({ data: documents as never, skipDuplicates: true });
  if (sunatSubmissions.length) await prisma.sunatSubmission.createMany({ data: sunatSubmissions as never, skipDuplicates: true });
  if (sunatResponses.length) await prisma.sunatResponse.createMany({ data: sunatResponses as never, skipDuplicates: true });
  if (cashRegisters.length) await prisma.cashRegister.createMany({ data: cashRegisters as never, skipDuplicates: true });
  if (cashMovements.length) await prisma.cashMovement.createMany({ data: cashMovements as never, skipDuplicates: true });

  // Suscripciones: remapear planId por código (los planes en PG los creó el
  // seed con IDs propios).
  const mysqlPlanCodeById = new Map(mysqlPlans.map((p) => [String(p.id), String(p.code)]));
  const pgPlans = await prisma.plan.findMany({ select: { id: true, code: true } });
  const planByCode = new Map(pgPlans.map((p) => [p.code, p.id]));
  let subsRemapadas = 0;
  for (const sub of subscriptions) {
    const codigo = mysqlPlanCodeById.get(String(sub.planId)) ?? "free";
    const targetPlanId = planByCode.get(codigo) ?? planByCode.get("free");
    if (!targetPlanId) continue;
    await prisma.subscription.create({
      data: {
        id: String(sub.id),
        businessId: String(sub.businessId),
        planId: targetPlanId,
        status: String(sub.status ?? "activa"),
        startsAt: (sub.startsAt as Date) ?? null,
        endsAt: (sub.endsAt as Date) ?? null,
      },
    });
    subsRemapadas++;
  }

  if (auditLogs.length) {
    await prisma.auditLog.createMany({ data: auditLogs as never, skipDuplicates: true });
  }

  const conteo = {
    usuarios: await prisma.user.count(),
    negocios: await prisma.business.count(),
    productos: await prisma.product.count(),
    clientes: await prisma.customer.count(),
    ventas: await prisma.sale.count(),
    comprobantes: await prisma.document.count(),
    suscripciones: subsRemapadas,
  };
  console.log("Migración completa. Prisma Postgres ahora tiene:", conteo);
}

main()
  .catch((error) => {
    console.error("Error en la migración:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
