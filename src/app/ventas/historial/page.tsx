import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatSoles, formatDateTime } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/constants";
import { Card, Badge, EmptyState } from "@/components/ui/Card";
import AppShell from "@/components/AppShell";
import { cancelSaleAction } from "@/app/actions/sales";

export const metadata = { title: "Historial de ventas" };

export default async function SalesHistoryPage() {
  const { business } = await requireBusiness();

  const sales = await prisma.sale.findMany({
    where: { businessId: business.id },
    include: {
      customer: true,
      items: true,
      documents: { take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalHoy = sales
    .filter((s) => {
      const today = new Date();
      return s.status === "completada" && s.createdAt >= new Date(today.setHours(0, 0, 0, 0));
    })
    .reduce((acc, s) => acc + Number(s.total), 0);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Historial de ventas</h1>
          <p className="text-neutral-500">Ventas de hoy: <span className="font-bold text-neutral-800">{formatSoles(totalHoy)}</span></p>
        </div>
        <Link
          href="/ventas"
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          + Nueva venta
        </Link>
      </div>

      {sales.length === 0 ? (
        <Card>
          <EmptyState
            emoji="🧾"
            title="Aún no tienes ventas"
            description="Registra tu primera venta. El sistema hará todo: stock, pago y comprobante."
            action={
              <Link href="/ventas" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
                Registrar venta
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {sales.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-neutral-900">{s.saleNumber}</p>
                    <Badge className={s.status === "completada" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}>
                      {s.status === "completada" ? "Completada" : "Anulada"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {s.customer?.name ?? "Cliente ocasional"} · {formatDateTime(s.createdAt)}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {paymentMethodLabel(s.paymentMethod)}
                    {s.documents[0] && (
                      <span className="ml-2">
                        📄 {s.documents[0].docType === "boleta" ? "Boleta" : "Factura"} {s.documents[0].series}-{String(s.documents[0].number).padStart(8, "0")}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {s.items.map((i) => `${i.name} ×${Number(i.quantity)}`).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-lg font-extrabold text-neutral-900">{formatSoles(s.total)}</span>
                  {s.status === "completada" && (
                    <form action={cancelSaleAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="text-xs text-neutral-400 hover:text-red-600" title="Anular venta (reponer stock)">
                        Anular
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}