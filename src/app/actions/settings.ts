"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getSession } from "@/lib/auth";
import { sunatConfigSchema } from "@/lib/validations";
import type { Prisma } from "@/generated/prisma/client";

type ActionResult = { error?: string; ok?: boolean };

export async function saveSunatConfigAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return { error: "Sesión no válida." };

  const parsed = sunatConfigSchema.safeParse({
    ruc: formData.get("ruc") ?? "",
    razonSocial: formData.get("razon_social") ?? "",
    sunatUser: formData.get("sunat_user") ?? "",
    sunatPassword: formData.get("sunat_password") ?? "",
    seriesBoleta: formData.get("series_boleta") ?? "B001",
    seriesFactura: formData.get("series_factura") ?? "F001",
    environment: formData.get("environment") ?? "beta",
    certificatePassword: formData.get("certificate_password") ?? "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  const d = parsed.data;

  const business = await prisma.business.findFirst({
    where: { id: businessId, users: { some: { userId: user.id } } },
  });
  if (!business) return { error: "Negocio no encontrado." };

  const settings = (business.settings as Record<string, unknown>) ?? {};
  const sunat = (settings.sunat as Record<string, unknown>) ?? {};

  // Nota: en un MVP real las credenciales deben cifrarse (p. ej. con la clave
  // de la app) y nunca guardarse en texto plano. Aquí se separan del resto
  // de settings para que la capa de cifrado se conecte después.
  const newSunat = {
    ...sunat,
    ruc: d.ruc,
    razonSocial: d.razonSocial,
    sunatUser: d.sunatUser,
    // ⚠️ Cifrar antes de guardar en producción
    sunatPassword: d.sunatPassword ? `encrypted:${d.sunatPassword}` : (sunat.sunatPassword ?? null),
    seriesBoleta: d.seriesBoleta,
    seriesFactura: d.seriesFactura,
    environment: d.environment,
    certificatePassword: d.certificatePassword ? `encrypted:${d.certificatePassword}` : (sunat.certificatePassword ?? null),
  };

  await prisma.business.update({
    where: { id: business.id },
    data: {
      ruc: d.ruc || null,
      razonSocial: d.razonSocial || null,
      settings: {
        ...settings,
        sunat: newSunat,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/configuracion");
  return { ok: true };
}

export async function saveBusinessProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  const session = await getSession();
  const businessId = session?.businessId;
  if (!user || !businessId) return { error: "Sesión no válida." };

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "Urubamba").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (name.length < 2) return { error: "El nombre del negocio es obligatorio." };

  await prisma.business.update({
    where: { id: businessId },
    data: { name, phone: phone || null, address: address || null, city, description: description || null },
  });

  revalidatePath("/configuracion");
  return { ok: true };
}