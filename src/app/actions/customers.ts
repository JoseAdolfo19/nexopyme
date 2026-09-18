"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { scope } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";
import { getCurrentUser, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

type ActionResult = { error?: string };

type CustomerData = {
  docType: "DNI" | "RUC" | "CE" | "PASAPORTE" | "OTRO";
  docNumber: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  notes?: string;
};

async function upsertCustomerRecord(businessId: string, data: CustomerData) {
  const db = scope(businessId);
  const docNumber = data.docNumber || null;

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${businessId} FOR UPDATE`;

    const existing = docNumber
      ? await tx.customer.findFirst({ where: { docNumber } })
      : null;

    if (existing) {
      return tx.customer.update({
        where: { id: existing.id },
        data: { ...data, docNumber, isActive: true },
        select: { id: true, name: true, docType: true, docNumber: true },
      });
    }

    return tx.customer.create({
      data: { ...data, businessId, docNumber },
      select: { id: true, name: true, docType: true, docNumber: true },
    });
  }, { maxWait: 10_000, timeout: 15_000 });
}

export async function createCustomerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return { error: "Sesión no válida." };

  const parsed = customerSchema.safeParse({
    docType: formData.get("doc_type") ?? "DNI",
    docNumber: String(formData.get("doc_number") ?? "").trim().replace(/[\s-]/g, ""),
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  const d = parsed.data;
  await upsertCustomerRecord(businessId, {
    docType: d.docType,
    docNumber: d.docNumber ?? "",
    name: d.name,
    email: d.email || undefined,
    phone: d.phone || undefined,
    address: d.address || undefined,
    city: d.city || undefined,
    notes: d.notes || undefined,
  });

  await audit({
    action: "customer.create",
    userId: user.id,
    businessId,
    entityType: "Customer",
    newValues: { name: d.name, docType: d.docType, docNumber: d.docNumber },
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateCustomerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return { error: "Sesión no válida." };
  const db = scope(businessId);

  const id = String(formData.get("id") ?? "");
  const parsed = customerSchema.safeParse({
    docType: formData.get("doc_type") ?? "DNI",
    docNumber: String(formData.get("doc_number") ?? "").trim().replace(/[\s-]/g, ""),
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  const d = parsed.data;

  await db.customer.update({
    where: { id },
    data: {
      docType: d.docType,
      docNumber: d.docNumber || null,
      name: d.name,
      email: d.email || null,
      phone: d.phone || null,
      address: d.address || null,
      city: d.city || null,
      notes: d.notes || null,
    },
  });

  await audit({
    action: "customer.update",
    userId: user.id,
    businessId,
    entityType: "Customer",
    entityId: id,
    newValues: { name: d.name },
  });

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function deleteCustomerAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return;
  const db = scope(businessId);

  const id = String(formData.get("id") ?? "");
  const customer = await db.customer.findFirst({
    where: { id },
  });
  if (!customer) return;
  await db.customer.update({
    where: { id },
    data: { isActive: false },
  });

  await audit({
    action: "customer.delete",
    userId: user.id,
    businessId,
    entityType: "Customer",
    entityId: id,
  });

  revalidatePath("/clientes");
}

/** Wrapper de 1 argumento para usar directo en <form action>. */
export async function createCustomerFormAction(formData: FormData): Promise<void> {
  await createCustomerAction({}, formData);
}

export async function createCustomerForSaleAction(formData: FormData): Promise<
  { error: string } | { customer: { id: string; name: string; docType: string; docNumber: string | null } }
> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return { error: "Sesión no válida." };

  const parsed = customerSchema.safeParse({
    docType: formData.get("doc_type") ?? "DNI",
    docNumber: String(formData.get("doc_number") ?? "").trim().replace(/[\s-]/g, ""),
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  const d = parsed.data;
  const customer = await upsertCustomerRecord(businessId, {
    docType: d.docType,
    docNumber: d.docNumber ?? "",
    name: d.name,
    email: d.email || undefined,
    phone: d.phone || undefined,
    address: d.address || undefined,
    city: d.city || undefined,
    notes: d.notes || undefined,
  });

  await audit({
    action: "customer.create",
    userId: user.id,
    businessId,
    entityType: "Customer",
    entityId: customer.id,
    newValues: { name: customer.name, docType: customer.docType, docNumber: customer.docNumber },
  });

  revalidatePath("/clientes");
  revalidatePath("/ventas");
  return { customer };
}