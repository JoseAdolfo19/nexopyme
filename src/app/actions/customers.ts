"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { scope } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations";
import { getCurrentUser, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

type ActionResult = { error?: string };

export async function createCustomerAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return { error: "Sesión no válida." };
  const db = scope(businessId);

  const parsed = customerSchema.safeParse({
    docType: formData.get("doc_type") ?? "DNI",
    docNumber: formData.get("doc_number") ?? "",
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
  await db.customer.create({
    data: {
      businessId,
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
    docNumber: formData.get("doc_number") ?? "",
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