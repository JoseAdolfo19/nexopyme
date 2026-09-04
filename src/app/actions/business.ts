"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { businessSchema } from "@/lib/validations";
import { modulesForType } from "@/lib/constants";
import { getCurrentUser, getSession, setSession, switchBusiness } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { audit } from "@/lib/audit";

type ActionResult = { error?: string };

export async function createBusinessAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión no válida. Vuelve a ingresar." };

  const parsed = businessSchema.safeParse({
    name: formData.get("name"),
    businessType: formData.get("business_type"),
    sellsProducts: formData.get("sells_products") ?? "productos",
    needsInventory: formData.get("needs_inventory") ?? "si",
    needsAppointments: formData.get("needs_appointments") ?? "no",
    needsTables: formData.get("needs_tables") ?? "no",
    employees: formData.get("employees") ?? "1",
    issuesDocuments: formData.get("issues_documents") ?? "si",
    ruc: formData.get("ruc") ?? "",
    razonSocial: formData.get("razon_social") ?? "",
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    city: formData.get("city") ?? "Urubamba",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos ingresados." };
  }

  const data = parsed.data;

  // Slug único
  const baseSlug = slugify(data.name) || "negocio";
  let slug = baseSlug;
  let counter = 1;
  while (await prisma.business.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  // Configuración inteligente de módulos según el tipo de negocio + respuestas
  const modules = modulesForType(data.businessType);

  if (data.needsAppointments === "no") {
    const idx = modules.indexOf("agenda");
    if (idx !== -1) modules.splice(idx, 1);
  }
  if (data.needsTables === "no") {
    for (const m of ["mesas", "comandas", "cocina"]) {
      const idx = modules.indexOf(m);
      if (idx !== -1) modules.splice(idx, 1);
    }
  }
  if (data.needsInventory === "no") {
    const idx = modules.indexOf("inventario");
    if (idx !== -1) modules.splice(idx, 1);
  }
  if (data.sellsProducts === "servicios") {
    const idx = modules.indexOf("productos");
    if (idx !== -1) modules.splice(idx, 1);
    if (!modules.includes("servicios")) modules.push("servicios");
  }
  if (data.sellsProducts === "productos") {
    const idx = modules.indexOf("servicios");
    if (idx !== -1) modules.splice(idx, 1);
  }
  if (data.issuesDocuments === "no") {
    const idx = modules.indexOf("comprobantes");
    if (idx !== -1) modules.splice(idx, 1);
  }

  const settings = {
    sellsProducts: data.sellsProducts,
    needsInventory: data.needsInventory,
    needsAppointments: data.needsAppointments,
    needsTables: data.needsTables,
    employees: data.employees,
    issuesDocuments: data.issuesDocuments,
    sunat: {
      ruc: data.ruc || null,
      razonSocial: data.razonSocial || null,
      environment: "beta",
      seriesBoleta: "B001",
      seriesFactura: "F001",
    },
  };

  // Crear negocio en una transacción: negocio + membresía + sucursal principal + plan free
  const business = await prisma.$transaction(async (tx) => {
    const biz = await tx.business.create({
      data: {
        ownerId: user.id,
        name: data.name,
        slug,
        businessType: data.businessType,
        ruc: data.ruc || null,
        razonSocial: data.razonSocial || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || "Urubamba",
        modules,
        settings,
        status: "activo",
      },
    });

    await tx.businessUser.create({
      data: { businessId: biz.id, userId: user.id, role: "administrador" },
    });

    await tx.branch.create({
      data: { businessId: biz.id, name: "Principal", address: data.address || null, isMain: true },
    });

    const freePlan = await tx.plan.findUnique({ where: { code: "free" } });
    if (freePlan) {
      await tx.subscription.create({
        data: {
          businessId: biz.id,
          planId: freePlan.id,
          status: "activa",
          startsAt: new Date(),
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return biz;
  });

  // Activar negocio en la sesión
  const session = await getSession();
  await setSession({ ...(session ?? {}), userId: user.id, businessId: business.id });

  await audit({
    action: "business.create",
    userId: user.id,
    businessId: business.id,
    entityType: "Business",
    entityId: business.id,
    newValues: { name: business.name, businessType: business.businessType, modules },
  });

  redirect("/dashboard");
}

export async function switchBusinessAction(formData: FormData): Promise<void> {
  const to = String(formData.get("business") ?? "");
  // switchBusiness() (en auth) verifica que el usuario pertenezca al negocio
  // antes de cambiar la sesión, evitando acceso a negocios ajenos.
  const ok = await switchBusiness(to);
  redirect(ok ? "/dashboard" : "/onboarding");
}