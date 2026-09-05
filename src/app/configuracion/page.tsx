import { requireBusiness } from "@/lib/auth";
import { modulesForType, businessTypeLabel, PAYMENT_METHODS } from "@/lib/constants";
import { Card, CardHeader, Badge } from "@/components/ui/Card";
import AppShell from "@/components/AppShell";
import { BusinessProfileForm, SunatConfigForm } from "@/components/SettingsForms";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const { business } = await requireBusiness();

  const activeModules = (business.modules as string[]) ?? [];
  const allModulesForType = modulesForType(business.businessType);

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Configuración</h1>
        <p className="text-neutral-500">Ajusta los datos de tu negocio</p>
      </div>

      <div className="space-y-6">
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