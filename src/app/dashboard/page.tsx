import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatSoles, formatNumber, formatDateTime } from "@/lib/format";
import { DOCUMENT_STATUS, MODULE_MENU } from "@/lib/constants";
import { Card, CardHeader, Badge } from "@/components/ui/Card";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Inicio" };

export default async function DashboardPage() {
  const { business, user } = await requireBusiness();
  const modules = (business.modules as string[]) ?? [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    salesToday,
    salesMonth,
    profitMonth,
    productsSold,
    customersToday,
    lowStock,
    recentDocs,
    recentSales,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { status: "completada", createdAt: { gte: today } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { status: "completada", createdAt: { gte: monthStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.saleItem.aggregate({
      where: { sale: { status: "completada", createdAt: { gte: monthStart } } },
      _sum: { subtotal: true, cost: true },
    }),
    prisma.saleItem.aggregate({
      where: { sale: { status: "completada", createdAt: { gte: monthStart } } },
      _sum: { quantity: true },
    }),
    prisma.customer.count({ where: { createdAt: { gte: today } } }),
    prisma.product.findMany({
      where: { trackStock: true, isActive: true },
      orderBy: { stock: "asc" },
      take: 5,
    }),
    prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: true },
    }),
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: true, items: true },
    }),
  ]);

  const profit = (Number(profitMonth._sum.subtotal ?? 0) - Number(profitMonth._sum.cost ?? 0)) * 0.35; // ganancia bruta estimada simple
  const todaySales = Number(salesToday._sum.total ?? 0);

  const menu = modules
    .map((m) => MODULE_MENU[m])
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .filter((x) => x.href !== "/dashboard" && x.href !== "/configuracion");

  return (
    <AppShell>
      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">
          Hola, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-neutral-500">Así va tu negocio hoy</p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard emoji="💵" label="Ventas de hoy" value={formatSoles(todaySales)} sub={`${salesToday._count} ventas`} />
        <StatCard emoji="📅" label="Ventas del mes" value={formatSoles(Number(salesMonth._sum.total ?? 0))} sub={`${salesMonth._count} ventas`} />
        <StatCard emoji="📈" label="Ganancia estimada del mes" value={formatSoles(profit)} sub="Estimación simple" />
        <StatCard emoji="🧾" label="Productos vendidos" value={formatNumber(Number(productsSold._sum.quantity ?? 0))} sub="Este mes" />
      </div>

      {/* Accesos rápidos */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-neutral-900">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {menu.slice(0, 6).map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-5 text-center shadow-sm transition hover:border-brand-500 hover:shadow"
            >
              <span className="text-3xl">{m.emoji}</span>
              <span className="text-sm font-semibold text-neutral-800">{m.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Stock bajo */}
      {lowStock.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader
              title="⚠️ Stock bajo"
              subtitle="Productos que debes reponer"
              action={
                <Link href="/inventario" className="text-sm font-semibold text-brand-600 hover:underline">
                  Ver todo
                </Link>
              }
            />
            <ul className="divide-y divide-neutral-100">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-5 py-3">
                  <span className="font-medium text-neutral-800">{p.name}</span>
                  <Badge className="bg-red-100 text-red-700">
                    Quedan {Number(p.stock)} {p.unit}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Últimas ventas */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title="Últimas ventas"
            action={
              <Link href="/ventas/historial" className="text-sm font-semibold text-brand-600 hover:underline">
                Ver historial
              </Link>
            }
          />
          {recentSales.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-4xl">🧾</p>
              <p className="mt-2 font-medium text-neutral-700">Aún no tienes ventas</p>
              <p className="text-sm text-neutral-500">Registra tu primera venta para verla aquí.</p>
              <Link href="/ventas" className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
                Nueva venta
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {recentSales.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-neutral-800">{s.saleNumber}</p>
                    <p className="text-xs text-neutral-500">
                      {s.customer?.name ?? "Cliente ocasional"} · {formatDateTime(s.createdAt)}
                    </p>
                  </div>
                  <span className="font-bold text-neutral-900">{formatSoles(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Comprobantes recientes */}
      {recentDocs.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader
              title="Comprobantes recientes"
              action={
                <Link href="/comprobantes" className="text-sm font-semibold text-brand-600 hover:underline">
                  Ver todos
                </Link>
              }
            />
            <ul className="divide-y divide-neutral-100">
              {recentDocs.map((d) => {
                const st = DOCUMENT_STATUS[d.status] ?? DOCUMENT_STATUS.pendiente;
                return (
                  <li key={d.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-medium text-neutral-800">
                        {d.docType === "boleta" ? "Boleta" : "Factura"} {d.series}-{String(d.number).padStart(8, "0")}
                      </p>
                      <p className="text-xs text-neutral-500">{d.customerName ?? "—"} · {formatDateTime(d.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-neutral-900">{formatSoles(d.total)}</span>
                      <Badge className={st.color}>{st.label}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  emoji,
  label,
  value,
  sub,
}: {
  emoji: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="p-4">
      <span className="text-2xl">{emoji}</span>
      <p className="mt-2 text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold text-neutral-900">{value}</p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </Card>
  );
}