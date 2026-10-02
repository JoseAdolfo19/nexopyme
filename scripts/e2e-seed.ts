/**
 * Seed E2E temporal para prueba de aislamiento multi-tenant.
 * Crea dos usuarios con negocios, productos, clientes, ventas y comprobantes.
 * No forma parte de la app: borrar tras la prueba.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { modulesForType } from "../src/lib/constants";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function getSeedPassword(): string {
  const value = process.env.E2E_SEED_PASSWORD;
  if (!value || value.length < 8) {
    throw new Error("Define E2E_SEED_PASSWORD con al menos 8 caracteres.");
  }
  return value;
}

const password = getSeedPassword();

function round2(n: number) { return Math.round(n * 100) / 100; }

async function ensureUser(email: string, name: string, seedPassword: string) {
  const passwordHash = await bcrypt.hash(seedPassword, 12);
  return prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, emailVerified: new Date(), isActive: true },
    create: { name, email, passwordHash, emailVerified: new Date(), isActive: true },
  });
}

async function ensureBusiness(opts: {
  ownerId: string;
  name: string;
  slug: string;
  businessType: string;
}) {
  let biz = await prisma.business.findUnique({ where: { slug: opts.slug } });
  if (!biz) {
    biz = await prisma.business.create({
      data: {
        ownerId: opts.ownerId,
        name: opts.name,
        slug: opts.slug,
        businessType: opts.businessType,
        modules: modulesForType(opts.businessType),
        settings: { environment: "beta" },
        status: "activo",
      },
    });
  }
  await prisma.businessUser.upsert({
    where: { businessId_userId: { businessId: biz.id, userId: opts.ownerId } },
    update: { role: "administrador", isActive: true },
    create: { businessId: biz.id, userId: opts.ownerId, role: "administrador", isActive: true },
  });
  const branch = await prisma.branch.findFirst({ where: { businessId: biz.id, isMain: true } });
  if (!branch) {
    await prisma.branch.create({ data: { businessId: biz.id, name: "Principal", isMain: true, status: "activo" } });
  }
  return biz;
}

async function ensureData(opts: {
  businessId: string;
  userId: string;
  productName: string;
  productPrice: number;
  productCost: number;
  productStock: number;
  saleQty: number;
  customerName: string;
  customerDoc: string;
  series: string;
  bizTag: string;
}) {
  // Producto
  let product = await prisma.product.findFirst({ where: { businessId: opts.businessId, name: opts.productName } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        businessId: opts.businessId,
        name: opts.productName,
        salePrice: opts.productPrice,
        purchasePrice: opts.productCost,
        stock: opts.productStock,
        minStock: 2,
        trackStock: true,
        unit: "UNIDAD",
        type: "producto",
      },
    });
  }

  // Cliente
  let customer = await prisma.customer.findFirst({ where: { businessId: opts.businessId, name: opts.customerName } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { businessId: opts.businessId, name: opts.customerName, docType: "DNI", docNumber: opts.customerDoc },
    });
  }

  // Venta (una sola, idempotente por saleNumber)
  const saleNumber = `V${opts.bizTag}-E2E01`;
  let sale = await prisma.sale.findUnique({ where: { saleNumber } });
  if (!sale) {
    const bruto = round2(opts.saleQty * opts.productPrice);
    // IGV incluido en el precio (como computeTotals para boleta)
    const total = bruto;
    const tax = round2(total - total / 1.18);
    const subtotal = round2(total - tax);

    sale = await prisma.sale.create({
      data: {
        businessId: opts.businessId,
        customerId: customer.id,
        userId: opts.userId,
        saleNumber,
        subtotal,
        discount: 0,
        tax,
        total,
        paymentMethod: "efectivo",
        status: "completada",
        notes: "E2E-SEED",
      },
    });

    await prisma.saleItem.create({
      data: {
        saleId: sale.id,
        productId: product.id,
        name: product.name,
        quantity: opts.saleQty,
        price: opts.productPrice,
        cost: round2(opts.productCost * opts.saleQty),
        subtotal: bruto,
      },
    });

    await prisma.payment.create({
      data: { businessId: opts.businessId, saleId: sale.id, userId: opts.userId, method: "efectivo", amount: total },
    });

    const before = Number(product.stock);
    const after = round2(before - opts.saleQty);
    await prisma.product.update({ where: { id: product.id }, data: { stock: after } });
    await prisma.inventoryMovement.create({
      data: {
        businessId: opts.businessId,
        productId: product.id,
        userId: opts.userId,
        type: "venta",
        quantity: opts.saleQty,
        stockBefore: before,
        stockAfter: after,
        reason: `Venta ${saleNumber}`,
        referenceId: sale.id,
        referenceType: "sale",
      },
    });
  }

  // Comprobante boleta
  let doc = await prisma.document.findFirst({ where: { businessId: opts.businessId, saleId: sale.id } });
  if (!doc) {
    const count = await prisma.document.count({ where: { businessId: opts.businessId, series: opts.series } });
    doc = await prisma.document.create({
      data: {
        businessId: opts.businessId,
        saleId: sale.id,
        customerId: customer.id,
        docType: "boleta",
        series: opts.series,
        number: count + 1,
        customerDocType: "DNI",
        customerDocNumber: opts.customerDoc,
        customerName: opts.customerName,
        subtotal: sale.subtotal,
        tax: sale.tax,
        total: sale.total,
        status: "pendiente",
      },
    });
  }

  return { product, customer, sale, doc };
}

async function makeSessionJwt(userId: string, businessId: string) {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  return new SignJWT({ userId, businessId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${60 * 60 * 24 * 7}s`)
    .sign(secret);
}

async function main() {
  const userA = await ensureUser("ana.e2e@tiendaplus.test", "Ana Alfa", password);
  const userB = await ensureUser("bruno.e2e@tiendaplus.test", "Bruno Beta", password);

  const bizA = await ensureBusiness({ ownerId: userA.id, name: "Almacenes E2E Alfa", slug: "e2e-alfa", businessType: "bodega" });
  const bizB = await ensureBusiness({ ownerId: userB.id, name: "Ferreteria E2E Beta", slug: "e2e-beta", businessType: "ferreteria" });

  const dataA = await ensureData({
    businessId: bizA.id, userId: userA.id,
    productName: "Producto Alfa Secreto", productPrice: 100, productCost: 60, productStock: 10,
    saleQty: 2, customerName: "Juan Perez Alfa", customerDoc: "11111111",
    series: "B001", bizTag: "ALFA",
  });

  const dataB = await ensureData({
    businessId: bizB.id, userId: userB.id,
    productName: "Producto Beta Visible", productPrice: 50, productCost: 30, productStock: 5,
    saleQty: 1, customerName: "Maria Lopez Beta", customerDoc: "22222222",
    series: "B001", bizTag: "BETA",
  });

  const jwtA = await makeSessionJwt(userA.id, bizA.id);
  const jwtB = await makeSessionJwt(userB.id, bizB.id);

  console.log(JSON.stringify({
    password,
    userA: { id: userA.id, email: userA.email },
    userB: { id: userB.id, email: userB.email },
    bizA: { id: bizA.id, name: bizA.name },
    bizB: { id: bizB.id, name: bizB.name },
    dataA: {
      productId: dataA.product.id,
      customerId: dataA.customer.id,
      saleId: dataA.sale.id,
      saleNumber: dataA.sale.saleNumber,
      docId: dataA.doc.id,
    },
    dataB: {
      productId: dataB.product.id,
      customerId: dataB.customer.id,
      saleId: dataB.sale.id,
      saleNumber: dataB.sale.saleNumber,
      docId: dataB.doc.id,
    },
    jwtA, jwtB,
  }, null, 2));
}

main()
  .catch((e) => { console.error("SEED ERROR:", e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
