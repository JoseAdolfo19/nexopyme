import { requireBusiness } from "@/lib/auth";
import { modulesForType, businessTypeLabel, PAYMENT_METHODS, PLAN_CATALOG } from "@/lib/constants";
import { Card, CardHeader, Badge } from "@/components/ui/Card";
import AppShell from "@/components/AppShell";
import { BusinessProfileForm, SunatConfigForm } from "@/components/SettingsForms";
import TeamForm from "@/components/TeamForm";
import { prisma } from "@/lib/prisma";
import { countMonthlyFiscalDocuments, getBusinessPlan } from "@/lib/plans";
import BranchManagementForm from "@/components/BranchManagementForm";
import { formatSoles } from "@/lib/format";

export const metadata = { title: "Configuración" };

function formatPlanLimit(limit: number | null): string {
  return limit === null ? "Ilimitado" : limit.toLocaleString("es-PE");
}

export default async function SettingsPage() {
  const { business, user } = await requireBusiness();

  const members = await prisma.businessUser.findMany({
    where: { businessId: business.id, isActive: true },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const currentMember = members.find((member) => member.user.id === user.id);

  const [branches, plan, documentsUsed, productsUsed] = await Promise.all([
    prisma.branch.findMany({
      where: { businessId: business.id, status: "activo" },
      select: { id: true, name: true, address: true, isMain: true },
      orderBy: [{ isMain: "desc" }, { createdAt: "asc" }],
    }),
    getBusinessPlan(business.id),
    countMonthlyFiscalDocuments(prisma, business.id),
    prisma.product.count({ where: { businessId: business.id, isActive: true } }),
  ]);

  const activeModules = (business.modules as string[]) ?? [];
  const allModulesForType = modulesForType(business.businessType);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Configuración</h1>
        <p className="text-neutral-500">Ajusta los datos de tu negocio</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Plan y uso" subtitle="Los comprobantes se comparten entre todas las sucursales" />
          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase text-neutral-500">Plan activo</p>
                <p className="mt-1 text-lg font-bold text-neutral-900">{plan.name}</p>
                <p className="text-sm text-neutral-600">{formatSoles(plan.price)} / mes</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-neutral-500">Comprobantes fiscales este mes</p>
                <p className="mt-1 text-lg font-bold text-neutral-900">{documentsUsed.toLocaleString("es-PE")} / {formatPlanLimit(plan.limits.documents)}</p>
                <p className="text-sm text-neutral-600">Boletas y facturas, compartidas por sede</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-neutral-500">Sucursales</p>
                <p className="mt-1 text-lg font-bold text-neutral-900">{branches.length} / {formatPlanLimit(plan.limits.branches)}</p>
                <p className="text-sm text-neutral-600">Sedes activas del negocio</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-neutral-500">Usuarios y productos</p>
                <p className="mt-1 text-lg font-bold text-neutral-900">{members.length}/{formatPlanLimit(plan.limits.users)} usuarios</p>
                <p className="text-sm text-neutral-600">{productsUsed.toLocaleString("es-PE")}/{formatPlanLimit(plan.limits.products)} productos</p>
              </div>
            </div>
            <div className="mt-5 divide-y divide-neutral-100 border-t border-neutral-100">
              {PLAN_CATALOG.map((availablePlan) => (
                <div key={availablePlan.code} className="grid gap-2 py-4 text-sm sm:grid-cols-[200px_1fr]">
                  <div>
                    <p className={availablePlan.code === plan.code ? "font-bold text-brand-700" : "font-semibold text-neutral-900"}>
                      {availablePlan.name}{availablePlan.code === plan.code ? " · Activo" : ""}
                    </p>
                    <p className="text-xs text-neutral-500">{availablePlan.audience}</p>
                    <p className="mt-1 font-bold text-neutral-800">{formatSoles(availablePlan.price)} / mes</p>
                  </div>
                  <div>
                    <p className="text-neutral-600">{availablePlan.summary}</p>
                    <ul className="mt-2 grid gap-x-4 gap-y-1 text-xs text-neutral-600 sm:grid-cols-2">
                      {availablePlan.features.map((feature) => <li key={feature}>• {feature}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-neutral-100 pt-4 text-sm text-neutral-600">
              Los planes pagados se cobran y activan manualmente después de confirmar el pago. Todavía no hay una pasarela integrada; solicita el cambio al canal de soporte habitual.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sucursales" subtitle="Registra y asigna ventas a cada sede" />
          <div className="p-5">
            <BranchManagementForm
              branches={branches}
              maxBranches={plan.limits.branches}
              canManage={currentMember?.role === "administrador"}
            />
          </div>
        </Card>

        {/* Datos del negocio */}
        <Card>
          <CardHeader title="Datos del negocio" subtitle="La información que ven tus clientes" />
          <div className="p-5">
            <BusinessProfileForm
              business={{
                name: business.name,
                phone: business.phone,
                address: business.address,
                city: business.city,
                description: business.description,
              }}
            />
          </div>
        </Card>

        {/* Configuración SUNAT */}
        <Card>
          <CardHeader title="Facturación electrónica (SUNAT)" subtitle="Datos para emitir boletas y facturas" />
          <div className="p-5">
            <SunatConfigForm
              business={{
                ruc: business.ruc,
                razonSocial: business.razonSocial,
                settings: business.settings as {
                  sunat?: {
                    sunatUser?: string;
                    seriesBoleta?: string;
                    seriesFactura?: string;
                    environment?: string;
                  };
                } | null,
              }}
            />
          </div>
        </Card>

        {/* Módulos activos */}
        <Card>
          <CardHeader
            title="Funciones de tu sistema"
            subtitle={`Configuradas según tu tipo de negocio: ${businessTypeLabel(business.businessType)}`}
          />
          <div className="p-5">
            <div className="flex flex-wrap gap-2">
              {allModulesForType.map((m) => (
                <Badge
                  key={m}
                  className={
                    activeModules.includes(m)
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-neutral-100 text-neutral-400 line-through"
                  }
                >
                  {m}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              Los módulos se activaron automáticamente al crear tu negocio. No se muestran
              funciones que tu negocio no necesita.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Equipo y roles" subtitle="Controla qué puede hacer cada usuario en este negocio" />
          <div className="p-5">
            <TeamForm
              canManage={currentMember?.role === "administrador"}
              members={members.map((member) => ({
                userId: member.user.id,
                name: member.user.name,
                email: member.user.email,
                role: member.role,
                isActive: member.isActive,
              }))}
            />
          </div>
        </Card>

        {/* Métodos de pago habilitados */}
        <Card>
          <CardHeader title="Métodos de pago" subtitle="Los que puedes usar al registrar ventas" />
          <div className="flex flex-wrap gap-2 p-5">
            {PAYMENT_METHODS.map((m) => (
              <Badge key={m.value} className="bg-neutral-100 text-neutral-700">
                {m.emoji} {m.label}
              </Badge>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}