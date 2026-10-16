import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { scope } from "@/lib/prisma";
import { formatSoles, formatDate } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui/Card";
import AppShell from "@/components/AppShell";
import { deleteCustomerAction } from "@/app/actions/customers";

export const metadata = { title: "Clientes" };

const PAGE_SIZE = 20;

type Props = { searchParams: Promise<{ page?: string }> };

export default async function CustomersPage({ searchParams }: Props) {
  const { business } = await requireBusiness();
  const db = scope(business.id);

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where: { businessId: business.id, isActive: true },
      include: {
        _count: { select: { sales: true } },
        sales: {
          where: { status: "completada" },
          select: { total: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.customer.count({ where: { businessId: business.id, isActive: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Mis clientes</h1>
          <p className="text-neutral-500">{total} clientes registrados</p>
        </div>
        <Link
          href="/clientes/nuevo"
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          + Nuevo cliente
        </Link>
      </div>

      {total === 0 ? (
        <Card>
          <EmptyState
            emoji="👥"
            title="Aún no tienes clientes"
            description="Registra a tus clientes para ver su historial de compras y enviarles comprobantes."
            action={
              <Link href="/clientes/nuevo" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
                Registrar cliente
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map((c) => {
            const totalComprado = c.sales.reduce((acc, s) => acc + Number(s.total), 0);
            const ultimaCompra = c.sales.length
              ? c.sales.reduce((a, b) => (b.createdAt > a.createdAt ? b : a))
              : null;
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-base font-bold text-brand-700">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-neutral-900">{c.name}</p>
                        <p className="truncate text-xs text-neutral-500">
                          {c.docType} {c.docNumber ?? "—"}
                          {c.phone ? ` · 📞 ${c.phone}` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                  <form action={deleteCustomerAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600" title="Eliminar">
                      ✕
                    </button>
                  </form>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-neutral-100 pt-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{formatSoles(totalComprado)}</p>
                    <p className="text-[11px] text-neutral-500">Total comprado</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{c._count.sales}</p>
                    <p className="text-[11px] text-neutral-500">Compras</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900">{ultimaCompra ? formatDate(ultimaCompra.createdAt) : "—"}</p>
                    <p className="text-[11px] text-neutral-500">Última compra</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={`/clientes?page=${page - 1}`}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-neutral-500">
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/clientes?page=${page + 1}`}
              className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </AppShell>
  );
}