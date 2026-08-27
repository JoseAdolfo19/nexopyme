import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNumber, formatDateTime, formatSoles } from "@/lib/format";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui/Card";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Inventario" };

const TYPE_LABEL: Record<string, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  venta: "Venta",
};

export default async function InventoryPage() {
  const { business } = await requireBusiness();

  const [products, movements] = await Promise.all([
    prisma.product.findMany({
      where: { businessId: business.id, isActive: true, trackStock: true },
      include: { category: true },
      orderBy: [{ stock: "asc" }, { name: "asc" }],
    }),
    prisma.inventoryMovement.findMany({
      where: { businessId: business.id },
      include: { product: { select: { name: true } }, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const lowStock = products.filter((p) => Number(p.stock) <= Number(p.minStock));

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Inventario</h1>
        <p className="text-neutral-500">Controla el stock de tus productos</p>
      </div>

      {/* Alertas de stock bajo */}
      {lowStock.length > 0 && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-800">⚠️ {lowStock.length} producto(s) con stock bajo</p>
          <ul className="mt-2 space-y-1">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-red-700">{p.name}</span>
                <span className="text-red-600">Quedan {formatNumber(p.stock)} {p.unit} (mín: {formatNumber(p.minStock)})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lista de productos con stock */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-neutral-900">Stock actual</h2>
        {products.length === 0 ? (
          <Card>
            <EmptyState
              emoji="📦"
              title="No hay productos con stock"
              description='Registra productos en "Mis productos" o activa el control de stock.'
              action={
                <Link href="/productos/nuevo" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
                  Nuevo producto
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="space-y-2.5">
            {products.map((p) => (
              <Card key={p.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-900">{p.name}</p>
                  <p className="text-xs text-neutral-500">
                    {p.category?.name ?? "Sin categoría"} · Precio: {formatSoles(p.salePrice)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {Number(p.stock) <= Number(p.minStock) ? (
                    <Badge className="bg-red-100 text-red-700">{formatNumber(p.stock)} {p.unit}</Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700">{formatNumber(p.stock)} {p.unit}</Badge>
                  )}
                  <Link
                    href={`/inventario/${p.id}/ajustar`}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Ajustar
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Movimientos recientes */}
      <Card>
        <CardHeader title="Movimientos recientes" subtitle="Entradas, salidas y ajustes de stock" />
        {movements.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-neutral-500">Aún no hay movimientos.</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {movements.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{m.product?.name}</p>
                  <p className="text-xs text-neutral-500">
                    {m.reason} · {formatDateTime(m.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <Badge
                    className={
                      m.type === "entrada" ? "bg-emerald-100 text-emerald-700"
                      : m.type === "salida" || m.type === "venta" ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                    }
                  >
                    {TYPE_LABEL[m.type] ?? m.type}: {formatNumber(m.quantity)}
                  </Badge>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {formatNumber(m.stockBefore)} → {formatNumber(m.stockAfter)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}