"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { branchSchema, businessSchema } from "@/lib/validations";
import { modulesForType, PLAN_CATALOG } from "@/lib/constants";
import { getCurrentUser, getSession, requireBusiness, setSession, switchBusiness } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { audit } from "@/lib/audit";
import { getBusinessPlan } from "@/lib/plans";

type ActionResult = { error?: string; ok?: boolean };

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

  // Crear negocio en una transacción: negocio + membresía + sucursal principal
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

    let freePlanId: string | null = null;
    for (const catalogPlan of PLAN_CATALOG) {
      const plan = await tx.plan.upsert({
        where: { code: catalogPlan.code },
        update: {
          name: catalogPlan.name,
          price: catalogPlan.price,
          limits: { ...catalogPlan.limits },
          features: [...catalogPlan.features],
          isActive: true,
        },
        create: {
          code: catalogPlan.code,
          name: catalogPlan.name,
          price: catalogPlan.price,
          limits: { ...catalogPlan.limits },
          features: [...catalogPlan.features],
        },
      });
      if (catalogPlan.code === "free") freePlanId = plan.id;
    }
    if (!freePlanId) throw new Error("No se pudo cargar el plan Free.");
    await tx.subscription.create({
      data: { businessId: biz.id, planId: freePlanId, status: "activa", startsAt: new Date() },
    });

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

export async function createBranchAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const { user, business } = await requireBusiness();
  const membership = business.users.find((member) => member.userId === user.id && member.isActive);
  if (membership?.role !== "administrador") {
    return { error: "Solo un administrador puede agregar sucursales." };
  }

  const parsed = branchSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };

  const plan = await getBusinessPlan(business.id);
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${business.id} FOR UPDATE`;
    const branchCount = await tx.branch.count({ where: { businessId: business.id, status: "activo" } });
    if (plan.limits.branches !== null && branchCount >= plan.limits.branches) {
      return { error: `Tu plan ${plan.name} permite hasta ${plan.limits.branches} sucursal(es).` };
    }

    await tx.branch.create({
      data: {
        businessId: business.id,
        name: parsed.data.name,
        address: parsed.data.address || null,
        phone: parsed.data.phone || null,
      },
    });
    return { ok: true };
  });

  if (result.error) return result;
  revalidatePath("/configuracion");
  return { ok: true };
}

export async function switchBusinessAction(formData: FormData): Promise<void> {
  const to = String(formData.get("business") ?? "");
  // switchBusiness() (en auth) verifica que el usuario pertenezca al negocio
  // antes de cambiar la sesión, evitando acceso a negocios ajenos.
  const ok = await switchBusiness(to);
  redirect(ok ? "/dashboard" : "/onboarding");
}