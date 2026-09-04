"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saleSchema } from "@/lib/validations";
import { getCurrentUser, getSession } from "@/lib/auth";
import { computeTotals, createDocument, round2 } from "@/lib/sunat";
import { audit } from "@/lib/audit";

type ActionResult = { error?: string };

/**
 * Registra una venta completa de forma atómica:
 * 1. Valida datos y existencia de productos.
 * 2. Crea la venta con items.
 * 3. Descuenta stock y registra movimientos de inventario.
 * 4. Registra el pago.
 * 5. Genera el comprobante (boleta/factura) e inicia el flujo SUNAT.
 */
export async function createSaleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return { error: "Sesión no válida." };

  const itemsRaw = [];
  let idx = 0;
  while (true) {
    const productId = formData.get(`items[${idx}][product_id]`);
    const quantity = formData.get(`items[${idx}][quantity]`);
    const price = formData.get(`items[${idx}][price]`);
    if (!productId || !quantity) break;
    itemsRaw.push({ productId: String(productId), quantity: String(quantity), price: String(price ?? "0") });
    idx++;
  }

  const parsed = saleSchema.safeParse({
    customerId: formData.get("customer_id") ?? "",
    paymentMethod: formData.get("payment_method") ?? "efectivo",
    docType: formData.get("doc_type") ?? "boleta",
    notes: formData.get("notes") ?? "",
    items: itemsRaw,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa la venta." };
  }

  const d = parsed.data;

  const productIds = d.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, businessId, isActive: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validar stock
  for (const item of d.items) {
    const product = productMap.get(item.productId);
    if (!product) return { error: "Uno de los productos ya no está disponible." };
    if (product.trackStock && Number(product.stock) < item.quantity) {
      return { error: `No hay suficiente stock de "${product.name}". Quedan ${Number(product.stock)}.` };
    }
  }

  // Calcular totales (precios con IGV incluido ya en el producto)
  const subtotalNet = round2(
    d.items.reduce((acc, i) => acc + i.quantity * i.price, 0)
  );

  // Comprobante: en MVP la venta se registra siempre; si se pide comprobante
  // se genera boleta/factura. La boleta incluye IGV en el precio.
  const totals = computeTotals(subtotalNet, d.docType);

  const sale = await prisma.$transaction(async (tx) => {
    // Serializa las ventas del mismo negocio: `FOR UPDATE` sobre la fila del
    // negocio impide que dos ventas concurrentes calculen el mismo número.
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${businessId} FOR UPDATE`;

    const count = await tx.sale.count({ where: { businessId } });
    // `saleNumber` es `@unique` GLOBAL en el esquema, así que se antepone un
    // tag del negocio para evitar colisiones entre empresas distintas.
    const bizTag = businessId.replace(/-/g, "").slice(0, 8).toUpperCase();
    const saleNumber = `V${bizTag}-${String(count + 1).padStart(6, "0")}`;

    const sale = await tx.sale.create({
      data: {
        businessId,
        customerId: d.customerId || null,
        userId: user.id,
        saleNumber,
        subtotal: subtotalNet,
        discount: 0,
        tax: totals.tax,
        total: totals.total,
        paymentMethod: d.paymentMethod,
        status: "completada",
        notes: d.notes || null,
      },
    });

    // Items + descuento de stock
    for (const item of d.items) {
      const product = productMap.get(item.productId)!;

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: product.id,
          name: product.name,
          quantity: item.quantity,
          price: item.price,
          cost: Number(product.purchasePrice) * item.quantity,
          subtotal: round2(item.quantity * item.price),
        },
      });

      if (product.trackStock) {
        const before = Number(product.stock);
        const after = round2(before - item.quantity);
        await tx.product.update({ where: { id: product.id }, data: { stock: after } });
        await tx.inventoryMovement.create({
          data: {
            businessId,
            productId: product.id,
            userId: user.id,
            type: "venta",
            quantity: item.quantity,
            stockBefore: before,
            stockAfter: after,
            reason: `Venta ${saleNumber}`,
            referenceId: sale.id,
            referenceType: "sale",
          },
        });
      }
    }

    // Pago
    await tx.payment.create({
      data: {
        businessId,
        saleId: sale.id,
        userId: user.id,
        method: d.paymentMethod,
        amount: totals.total,
      },
    });

    return sale;
  });

  await audit({
    action: "sale.create",
    userId: user.id,
    businessId,
    entityType: "Sale",
    entityId: sale.id,
    newValues: { saleNumber: sale.saleNumber, total: sale.total, paymentMethod: sale.paymentMethod },
  });

  // Generar comprobante (fuera de la transacción principal para no bloquear
  // la venta si SUNAT tarda).
  try {
    const customer = d.customerId
      ? await prisma.customer.findUnique({ where: { id: d.customerId } })
      : null;

    await createDocument({
      businessId,
      saleId: sale.id,
      customerId: customer?.id,
      docType: d.docType,
      customerDocType: customer?.docType ?? null,
      customerDocNumber: customer?.docNumber ?? null,
      customerName: customer?.name ?? "CLIENTE VARIOS",
      customerAddress: customer?.address ?? null,
      totals,
    });
  } catch {
    // La venta queda registrada; el comprobante se reintentará desde
    // el job de sincronización (documentos pendientes).
  }

  revalidatePath("/dashboard");
  revalidatePath("/ventas/historial");
  redirect("/ventas/historial");
}

export async function cancelSaleAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return;

  const id = String(formData.get("id") ?? "");
  const sale = await prisma.sale.findFirst({ where: { id, businessId } });
  if (!sale || sale.status !== "completada") return;

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({ where: { id }, data: { status: "anulada" } });

    // Reponer stock
    const items = await tx.saleItem.findMany({ where: { saleId: id } });
    for (const item of items) {
      if (!item.productId) continue;
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || !product.trackStock) continue;
      const before = Number(product.stock);
      const after = round2(before + Number(item.quantity));
      await tx.product.update({ where: { id: product.id }, data: { stock: after } });
      await tx.inventoryMovement.create({
        data: {
          businessId,
          productId: product.id,
          userId: user.id,
          type: "entrada",
          quantity: item.quantity,
          stockBefore: before,
          stockAfter: after,
          reason: `Anulación de venta ${sale.saleNumber}`,
          referenceId: sale.id,
          referenceType: "sale",
        },
      });
    }
  });

  await audit({
    action: "sale.cancel",
    userId: user.id,
    businessId,
    entityType: "Sale",
    entityId: id,
    newValues: { status: "anulada", saleNumber: sale.saleNumber },
  });

  revalidatePath("/ventas/historial");
  revalidatePath("/dashboard");
}