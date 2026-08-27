import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatSoles, formatNumber } from "@/lib/format";
import { Card, Badge, EmptyState } from "@/components/ui/Card";
import AppShell from "@/components/AppShell";
import { deleteProductAction } from "@/app/actions/products";

export const metadata = { title: "Mis productos" };

export default async function ProductsPage() {
  const { business } = await requireBusiness();

  const products = await prisma.product.findMany({
    where: { businessId: business.id, isActive: true },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.category.findMany({
    where: { businessId: business.id, isActive: true },
  });

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Mis productos</h1>
          <p className="text-neutral-500">{products.length} productos registrados</p>
        </div>
        <Link
          href="/productos/nuevo"
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          + Nuevo producto
        </Link>
      </div>

      {/* Categorías */}
      {categories.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <Badge key={c.id} className="shrink-0 bg-brand-50 text-brand-700">
              {c.name}
            </Badge>
          ))}
        </div>
      )}

      {products.length === 0 ? (
        <Card>
          <EmptyState
            emoji="📦"
            title="Aún no tienes productos"
            description="Registra lo que vendes para empezar a hacer ventas."
            action={
              <Link href="/productos/nuevo" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
                Registrar producto
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-2xl">
                    {p.type === "servicio" ? "💼" : "📦"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-neutral-900">{p.name}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {p.category?.name ?? "Sin categoría"}
                      {p.code ? ` · ${p.code}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {p.trackStock && p.type === "producto" && (
                        <Badge className={Number(p.stock) <= Number(p.minStock) ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}>
                          Stock: {formatNumber(p.stock)} {p.unit}
                        </Badge>
                      )}
                      {p.type === "servicio" && <Badge className="bg-blue-100 text-blue-700">Servicio</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-lg font-extrabold text-neutral-900">{formatSoles(p.salePrice)}</span>
                  <div className="flex items-center gap-1">
                    <Link href={`/productos/${p.id}/editar`} className="rounded-lg px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100" title="Editar">
                      ✏️
                    </Link>
                    <form action={deleteProductAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600" title="Eliminar">
                        ✕
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}