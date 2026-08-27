"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getSession } from "@/lib/auth";
import { round2 } from "@/lib/sunat";

type ActionResult = { error?: string };

/** Ajuste de stock: entrada, salida o corrección manual. */
export async function adjustStockAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return { error: "Sesión no válida." };

  const productId = String(formData.get("product_id") ?? "");
  const type = String(formData.get("type") ?? "ajuste");
  const quantityRaw = Number(formData.get("quantity") ?? 0);
  const reason = String(formData.get("reason") ?? "");

  if (!productId) return { error: "Producto no válido." };
  if (!Number.isFinite(quantityRaw) || quantityRaw <= 0) return { error: "La cantidad debe ser mayor a 0." };

  const product = await prisma.product.findFirst({
    where: { id: productId, businessId },
  });
  if (!product) return { error: "Producto no encontrado." };

  const before = Number(product.stock);
  let after = before;

  if (type === "entrada") after = round2(before + quantityRaw);
  else if (type === "salida") {
    if (quantityRaw > before) return { error: `No puedes sacar más de lo que hay. Stock actual: ${before}.` };
    after = round2(before - quantityRaw);
  } else {
    // ajuste: quantity es el stock nuevo exacto
    after = round2(quantityRaw);
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id: product.id }, data: { stock: after } });
    await tx.inventoryMovement.create({
      data: {
        businessId,
        productId: product.id,
        userId: user.id,
        type: type === "ajuste" ? "ajuste" : type,
        quantity: type === "ajuste" ? round2(Math.abs(after - before)) : quantityRaw,
        stockBefore: before,
        stockAfter: after,
        reason: reason || (type === "entrada" ? "Entrada manual" : type === "salida" ? "Salida manual" : "Ajuste manual"),
      },
    });
  });

  revalidatePath("/inventario");
  revalidatePath("/dashboard");
  return { error: undefined };
}