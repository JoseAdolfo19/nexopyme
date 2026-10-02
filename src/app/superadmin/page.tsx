import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logoutAction } from "@/app/actions/auth";
import { businessTypeLabel } from "@/lib/constants";
import { formatSoles } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/Card";
import { PLAN_CATALOG } from "@/lib/constants";
import PlanAssignmentForm from "@/components/PlanAssignmentForm";

export const metadata: Metadata = { title: "Panel global" };

export default async function SuperAdminPage() {
  const user = await requireSuperAdmin();
  const [businesses, users, salesSummary, documents] = await Promise.all([
    prisma.business.findMany({
      select: {
        id: true,
        name: true,
        businessType: true,
        status: true,
        createdAt: true,
        owner: { select: { name: true, email: true } },
        _count: { select: { users: true, products: true, customers: true, sales: true, documents: true } },
        subscriptions: {
          where: { status: "activa" },
          include: { plan: { select: { code: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
    prisma.sale.aggregate({ _sum: { total: true }, _count: true }),
    prisma.document.count(),
  ]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image src="/logo_icono.png" alt="TiendaPlus" width={40} height={40} className="size-10 rounded-xl" />
            <div>
              <p className="font-extrabold text-neutral-900">Panel global</p>
              <p className="text-xs text-neutral-500">Administración de TiendaPlus</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/perfil" className="text-sm font-semibold text-neutral-600 hover:text-brand-600">{user.name}</Link>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100">Salir</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Resumen de todas las empresas</h1>
          <p className="text-neutral-500">Vista global de soporte y operación. Los secretos SUNAT nunca se muestran aquí.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Empresas" value={String(businesses.length)} />
          <Metric label="Usuarios" value={String(users)} />
          <Metric label="Ventas" value={String(salesSummary._count)} />
          <Metric label="Comprobantes" value={String(documents)} detail={formatSoles(salesSummary._sum.total ?? 0)} />
        </div>

        <Card>
          <CardHeader title="Planes disponibles" subtitle="Los planes de pago se asignan tras confirmar el cobro manual; no hay pasarela integrada." />
          <div className="divide-y divide-neutral-100 px-5">
            {PLAN_CATALOG.map((plan) => (
              <div key={plan.code} className="grid gap-2 py-3 sm:grid-cols-[180px_1fr]">
                <div>
                  <p className="font-semibold text-neutral-900">{plan.name} · S/ {plan.price}/mes</p>
                  <p className="text-xs text-neutral-500">{plan.audience}</p>
                </div>
                <p className="text-sm text-neutral-600">{plan.features.join(" · ")}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Empresas registradas" subtitle="Datos operativos agregados por negocio" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-neutral-100 text-xs uppercase text-neutral-500">
                <tr>
                  <th className="px-5 py-3">Empresa</th>
                  <th className="px-5 py-3">Propietario</th>
                  <th className="px-5 py-3">Rubro</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Plan / cobro manual</th>
                  <th className="px-5 py-3 text-right">Usuarios</th>
                  <th className="px-5 py-3 text-right">Ventas</th>
                  <th className="px-5 py-3 text-right">Comprobantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {businesses.map((business) => (
                  <tr key={business.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-4 font-semibold text-neutral-900">{business.name}</td>
                    <td className="px-5 py-4"><p className="text-neutral-800">{business.owner.name}</p><p className="text-xs text-neutral-500">{business.owner.email}</p></td>
                    <td className="px-5 py-4 text-neutral-600">{businessTypeLabel(business.businessType)}</td>
                    <td className="px-5 py-4"><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{business.status}</span></td>
                    <td className="px-5 py-4">
                      <PlanAssignmentForm
                        businessId={business.id}
                        currentPlanCode={business.subscriptions[0]?.plan.code ?? "free"}
                      />
                    </td>
                    <td className="px-5 py-4 text-right text-neutral-700">{business._count.users}</td>
                    <td className="px-5 py-4 text-right text-neutral-700">{business._count.sales}</td>
                    <td className="px-5 py-4 text-right text-neutral-700">{business._count.documents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-neutral-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-neutral-500">Total vendido: {detail}</p>}
    </Card>
  );
}
