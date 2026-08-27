import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatSoles, formatDateTime } from "@/lib/format";
import { DOCUMENT_STATUS, DOCUMENT_TYPES } from "@/lib/constants";
import { documentNumber } from "@/lib/sunat";
import { Card, Badge, EmptyState } from "@/components/ui/Card";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Comprobantes" };

export default async function DocumentsPage() {
  const { business } = await requireBusiness();

  const [documents, counts] = await Promise.all([
    prisma.document.findMany({
      where: { businessId: business.id },
      include: { customer: true, sale: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.document.groupBy({
      by: ["status"],
      where: { businessId: business.id },
      _count: true,
    }),
  ]);

  const statusCounts = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Comprobantes</h1>
        <p className="text-neutral-500">Boletas y facturas de tu negocio</p>
      </div>

      {/* Resumen de estados */}
      <div className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Object.entries(DOCUMENT_STATUS).map(([key, st]) => (
          <div key={key} className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
            <p className="text-xl font-extrabold text-neutral-900">{statusCounts[key] ?? 0}</p>
            <p className="text-[11px] font-medium text-neutral-500">{st.label}</p>
          </div>
        ))}
      </div>

      {documents.length === 0 ? (
        <Card>
          <EmptyState
            emoji="🧾"
            title="Aún no hay comprobantes"
            description="Cuando registres una venta con comprobante, aquí verás la boleta o factura con su estado."
            action={
              <Link href="/ventas" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
                Registrar venta
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((d) => {
            const st = DOCUMENT_STATUS[d.status] ?? DOCUMENT_STATUS.pendiente;
            const typeLabel = DOCUMENT_TYPES.find((t) => t.value === d.docType)?.label ?? d.docType;
            return (
              <Card key={d.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-neutral-900">{typeLabel}</p>
                      <span className="font-mono text-sm font-semibold text-neutral-700">
                        {documentNumber(d.series, d.number)}
                      </span>
                      <Badge className={st.color}>{st.label}</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {d.customerName ?? "—"} · {formatDateTime(d.createdAt)}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {d.sale?.paymentMethod ? `Pago: ${d.sale.paymentMethod}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-lg font-extrabold text-neutral-900">{formatSoles(d.total)}</span>
                    <Link
                      href={`/comprobantes/${d.id}`}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
                    >
                      Ver / Imprimir
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}