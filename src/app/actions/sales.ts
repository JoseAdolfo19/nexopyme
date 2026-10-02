"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, scope } from "@/lib/prisma";
import { saleSchema } from "@/lib/validations";
import { getCurrentUser, getSession, requireBusiness } from "@/lib/auth";
import { computeTotals, createDocument, round2 } from "@/lib/sunat";
import { audit } from "@/lib/audit";
import { countMonthlyFiscalDocuments, getBusinessPlan } from "@/lib/plans";

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
  const { user, business } = await requireBusiness();
  const businessId = business.id;
  const db = scope(businessId);

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
    branchId: formData.get("branch_id") ?? "",
    notes: formData.get("notes") ?? "",
    items: itemsRaw,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa la venta." };
  }

  const d = parsed.data;
  const plan = await getBusinessPlan(businessId);

  if (d.customerId) {
    const customer = await db.customer.findFirst({
      where: { id: d.customerId, businessId, isActive: true },
      select: { id: true },
    });
    if (!customer) return { error: "El cliente seleccionado no pertenece a este negocio." };
  }

  const productIds = d.items.map((i) => i.productId);
  const products = await db.product.findMany({
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

  const saleResult = await prisma.$transaction(async (tx) => {
    // Serializa las ventas del mismo negocio: `FOR UPDATE` sobre la fila del
    // negocio impide que dos ventas concurrentes calculen el mismo número.
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${businessId} FOR UPDATE`;

    if (d.docType === "boleta" || d.docType === "factura") {
      const used = await countMonthlyFiscalDocuments(tx, businessId);
      if (plan.limits.documents !== null && used >= plan.limits.documents) {
        return { error: `Alcanzaste el límite mensual de ${plan.limits.documents} comprobantes de tu plan ${plan.name}.` };
      }
    }

    const branch = d.branchId
      ? await tx.branch.findFirst({
          where: { id: d.branchId, businessId, status: "activo" },
          select: { id: true },
        })
      : await tx.branch.findFirst({ where: { businessId, isMain: true, status: "activo" }, select: { id: true } });
    if (d.branchId && !branch) return { error: "La sucursal seleccionada no pertenece a este negocio." };

    const count = await tx.sale.count({ where: { businessId } });
    // `saleNumber` es `@unique` GLOBAL en el esquema, así que se antepone un
    // tag del negocio para evitar colisiones entre empresas distintas.
    const bizTag = businessId.replace(/-/g, "").slice(0, 8).toUpperCase();
    const saleNumber = `V${bizTag}-${String(count + 1).padStart(6, "0")}`;

    const sale = await tx.sale.create({
      data: {
        businessId,
        branchId: branch?.id ?? null,
        customerId: d.customerId || null,
        userId: user.id,
        saleNumber,
        subtotal: subtotalNet,
        discount: 0,
        tax: totals.tax,
        total: totals.total,
        paymentMethod: d.paymentMethod,
        docType: d.docType,
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

    return { sale };
  }, { maxWait: 10_000, timeout: 15_000 });

  if ("error" in saleResult) return { error: saleResult.error };
  const sale = saleResult.sale;

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
  let documentId: string | null = null;
  try {
    const customer = d.customerId
      ? await db.customer.findFirst({ where: { id: d.customerId, businessId } })
      : null;

    const document = await createDocument({
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
    documentId = document?.id ?? null;
  } catch {
    // La venta queda registrada; el comprobante se reintentará desde
    // el job de sincronización (documentos pendientes).
  }

  revalidatePath("/dashboard");
  revalidatePath("/ventas/historial");
  redirect(documentId ? `/comprobantes/${documentId}?print=1` : "/ventas/historial");
}

export async function cancelSaleAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return;
  const db = scope(businessId);

  const id = String(formData.get("id") ?? "");
  const sale = await db.sale.findFirst({ where: { id, businessId } });
  if (!sale || sale.status !== "completada") return;

  await db.$transaction(async (tx) => {
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