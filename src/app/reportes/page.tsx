import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatSoles, formatNumber } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/constants";
import { Card, CardHeader } from "@/components/ui/Card";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Reportes" };

export default async function ReportsPage() {
  const { business } = await requireBusiness();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [salesToday, salesMonth, byProduct, byMethod, byDay, monthSales] = await Promise.all([
    prisma.sale.aggregate({
      where: { businessId: business.id, status: "completada", createdAt: { gte: todayStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { businessId: business.id, status: "completada", createdAt: { gte: monthStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.saleItem.groupBy({
      by: ["productId", "name"],
      where: { sale: { businessId: business.id, status: "completada", createdAt: { gte: monthStart } } },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    prisma.sale.groupBy({
      by: ["paymentMethod"],
      where: { businessId: business.id, status: "completada", createdAt: { gte: todayStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.findMany({
      where: { businessId: business.id, status: "completada", createdAt: { gte: monthStart } },
      select: { createdAt: true, total: true },
    }),
    prisma.sale.aggregate({
      where: { businessId: business.id, status: "completada", createdAt: { gte: monthStart } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  // Agrupar ventas por día del mes
  const byDayMap = new Map<string, { date: string; total: number; count: number }>();
  for (const s of byDay) {
    const key = s.createdAt.toISOString().slice(0, 10);
    const cur = byDayMap.get(key) ?? { date: key, total: 0, count: 0 };
    cur.total += Number(s.total);
    cur.count += 1;
    byDayMap.set(key, cur);
  }
  const byDayList = Array.from(byDayMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 15);

  // Construir CSV de ventas por día (para exportar)
  const csvRows = [
    ["Fecha", "Ventas", "Total"],
    ...byDayList.map((d) => [d.date, String(d.count), d.total.toFixed(2)]),
  ];
  const csv = csvRows.map((r) => r.join(",")).join("\n");

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Reportes</h1>
        <p className="text-neutral-500">Cómo le va a tu negocio</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Hoy</p>
          <p className="text-xl font-extrabold text-neutral-900">{formatSoles(salesToday._sum.total ?? 0)}</p>
          <p className="text-xs text-neutral-400">{salesToday._count} ventas</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-neutral-500">Este mes</p>
          <p className="text-xl font-extrabold text-neutral-900">{formatSoles(salesMonth._sum.total ?? 0)}</p>
          <p className="text-xs text-neutral-400">{salesMonth._count} ventas</p>
        </Card>
      </div>

      {/* Ventas por método de pago (hoy) */}
      <div className="mt-6">
        <Card>
          <CardHeader title="Ventas de hoy por método de pago" />
          {byMethod.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-neutral-500">Aún no hay ventas hoy.</div>
          ) : (
            <div className="space-y-3 p-5">
              {byMethod.map((m) => (
                <div key={m.paymentMethod}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-neutral-700">{paymentMethodLabel(m.paymentMethod)}</span>
                    <span className="font-bold text-neutral-900">{formatSoles(m._sum.total ?? 0)}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-neutral-100">
                    <div
                      className="h-2 rounded-full bg-brand-600"
                      style={{
                        width: `${salesToday._sum.total ? (Number(m._sum.total ?? 0) / Number(salesToday._sum.total)) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex justify-between border-t border-neutral-100 pt-3">
                <span className="font-bold text-neutral-800">TOTAL</span>
                <span className="font-extrabold text-neutral-900">{formatSoles(salesToday._sum.total ?? 0)}</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Productos más vendidos */}
      <div className="mt-6">
        <Card>
          <CardHeader title="Productos más vendidos del mes" />
          {byProduct.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-neutral-500">Sin ventas este mes todavía.</div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {byProduct.map((p, i) => (
                <li key={p.productId ?? p.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-neutral-800">{p.name}</p>
                      <p className="text-xs text-neutral-500">{formatNumber(p._sum.quantity ?? 0)} unidades</p>
                    </div>
                  </div>
                  <span className="font-bold text-neutral-900">{formatSoles(p._sum.subtotal ?? 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Ventas por día (últimos 15 días) */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title="Ventas por día"
            action={
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
                download="ventas-por-dia.csv"
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                ⬇ Exportar CSV
              </a>
            }
          />
          {byDayList.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-neutral-500">Sin datos.</div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {byDayList.map((d) => (
                <li key={d.date} className="flex items-center justify-between px-5 py-2.5">
                  <span className="text-sm text-neutral-600">
                    {new Date(d.date + "T00:00:00").toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  <span className="text-sm text-neutral-500">{d.count} ventas</span>
                  <span className="font-bold text-neutral-900">{formatSoles(d.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}