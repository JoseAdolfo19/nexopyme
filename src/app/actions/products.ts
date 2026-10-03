"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, scope } from "@/lib/prisma";
import { categorySchema, productSchema } from "@/lib/validations";
import { requireBusiness } from "@/lib/auth";
import { FORBIDDEN_ROLE, getRoleInBusiness, requireRole } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { supportsProductBarcodes, type BusinessRole } from "@/lib/constants";
import { getBusinessPlan } from "@/lib/plans";

type ActionResult = { error?: string };

const PRODUCT_ROLES: readonly BusinessRole[] = ["administrador", "almacen"];

export async function createProductAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user, business } = await requireBusiness();
  const businessId = business.id;
  const role = await getRoleInBusiness(user.id, businessId);
  if (!role || !PRODUCT_ROLES.includes(role)) {
    return { error: FORBIDDEN_ROLE };
  }

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    categoryId: formData.get("category_id") ?? "",
    code: formData.get("code") ?? "",
    barcode: supportsProductBarcodes(business.businessType) ? formData.get("barcode") ?? "" : "",
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

  const plan = await getBusinessPlan(businessId);
  const createResult = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${businessId} FOR UPDATE`;
    const productCount = await tx.product.count({ where: { businessId, isActive: true } });
    if (plan.limits.products !== null && productCount >= plan.limits.products) {
      return { error: `El plan ${plan.name} permite hasta ${plan.limits.products} productos.` };
    }

    await tx.product.create({
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
    return { ok: true };
  });
  if (createResult.error) return createResult;

  await audit({
    action: "product.create",
    userId: user.id,
    businessId,
    entityType: "Product",
    newValues: { name: d.name, code: d.code, salePrice: d.salePrice },
  });

  revalidatePath("/productos");
  redirect("/productos");
}

export async function updateProductAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user, business } = await requireBusiness();
  const businessId = business.id;
  const role = await getRoleInBusiness(user.id, businessId);
  if (!role || !PRODUCT_ROLES.includes(role)) {
    return { error: FORBIDDEN_ROLE };
  }
  const db = scope(businessId);

  const id = String(formData.get("id") ?? "");
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    categoryId: formData.get("category_id") ?? "",
    code: formData.get("code") ?? "",
    barcode: supportsProductBarcodes(business.businessType) ? formData.get("barcode") ?? "" : "",
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

  await db.product.update({
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

  await audit({
    action: "product.update",
    userId: user.id,
    businessId,
    entityType: "Product",
    entityId: id,
    newValues: { name: d.name, code: d.code, salePrice: d.salePrice },
  });

  revalidatePath("/productos");
  redirect("/productos");
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  const ctx = await requireRole(PRODUCT_ROLES);
  if (!ctx) return;
  const { user, businessId } = ctx;
  const db = scope(businessId);

  const id = String(formData.get("id") ?? "");
  await db.product.update({ where: { id }, data: { isActive: false } });

  await audit({
    action: "product.delete",
    userId: user.id,
    businessId,
    entityType: "Product",
    entityId: id,
  });

  revalidatePath("/productos");
}

export async function createCategoryAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(PRODUCT_ROLES);
  if (!ctx) return { error: FORBIDDEN_ROLE };
  const { user, businessId } = ctx;
  const db = scope(businessId);

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") ?? "producto",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  await db.category.create({
    data: { businessId, name: parsed.data.name, type: parsed.data.type },
  });

  await audit({
    action: "category.create",
    userId: user.id,
    businessId,
    entityType: "Category",
    newValues: { name: parsed.data.name, type: parsed.data.type },
  });

  revalidatePath("/productos");
  redirect("/productos");
}