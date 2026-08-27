"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { categorySchema, productSchema } from "@/lib/validations";
import { getCurrentUser, getSession } from "@/lib/auth";

type ActionResult = { error?: string };

export async function createProductAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return { error: "Sesión no válida." };

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    categoryId: formData.get("category_id") ?? "",
    code: formData.get("code") ?? "",
    barcode: formData.get("barcode") ?? "",
    brand: formData.get("brand") ?? "",
    type: formData.get("type") ?? "producto",
    unit: formData.get("unit") ?? "UNIDAD",
    purchasePrice: formData.get("purchase_price") ?? 0,
    salePrice: formData.get("sale_price") ?? 0,
    stock: formData.get("stock") ?? 0,
    minStock: formData.get("min_stock") ?? 0,
    trackStock: formData.get("track_stock") === "on" || formData.get("track_stock") === "1",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  const d = parsed.data;

  await prisma.product.create({
    data: {
      businessId,
      name: d.name,
      description: d.description || null,
      categoryId: d.categoryId || null,
      code: d.code || null,
      barcode: d.barcode || null,
      brand: d.brand || null,
      type: d.type,
      unit: d.unit,
      purchasePrice: d.purchasePrice,
      salePrice: d.salePrice,
      stock: d.stock,
      minStock: d.minStock,
      trackStock: d.trackStock,
    },
  });

  revalidatePath("/productos");
  redirect("/productos");
}

export async function updateProductAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return { error: "Sesión no válida." };

  const id = String(formData.get("id") ?? "");
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    categoryId: formData.get("category_id") ?? "",
    code: formData.get("code") ?? "",
    barcode: formData.get("barcode") ?? "",
    brand: formData.get("brand") ?? "",
    type: formData.get("type") ?? "producto",
    unit: formData.get("unit") ?? "UNIDAD",
    purchasePrice: formData.get("purchase_price") ?? 0,
    salePrice: formData.get("sale_price") ?? 0,
    stock: formData.get("stock") ?? 0,
    minStock: formData.get("min_stock") ?? 0,
    trackStock: formData.get("track_stock") === "on" || formData.get("track_stock") === "1",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  const d = parsed.data;

  await prisma.product.update({
    where: { id },
    data: {
      name: d.name,
      description: d.description || null,
      categoryId: d.categoryId || null,
      code: d.code || null,
      barcode: d.barcode || null,
      brand: d.brand || null,
      type: d.type,
      unit: d.unit,
      purchasePrice: d.purchasePrice,
      salePrice: d.salePrice,
      minStock: d.minStock,
      trackStock: d.trackStock,
    },
  });

  revalidatePath("/productos");
  redirect("/productos");
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const session = await getSession();
  if (!user || !session?.businessId) return;

  const id = String(formData.get("id") ?? "");
  await prisma.product.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/productos");
}

export async function createCategoryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return { error: "Sesión no válida." };

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") ?? "producto",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  await prisma.category.create({
    data: { businessId, name: parsed.data.name, type: parsed.data.type },
  });

  revalidatePath("/productos");
  redirect("/productos");
}