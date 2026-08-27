import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatSoles, formatDateTime } from "@/lib/format";
import { DOCUMENT_STATUS } from "@/lib/constants";
import { documentNumber } from "@/lib/sunat";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/Card";

export const metadata = { title: "Comprobante" };

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business } = await requireBusiness();
  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id, businessId: business.id },
    include: { sale: { include: { items: true } } },
  });
  if (!doc) notFound();

  const st = DOCUMENT_STATUS[doc.status] ?? DOCUMENT_STATUS.pendiente;
  const isFactura = doc.docType === "factura";

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Comprobante</h1>
          <p className="text-neutral-500">Boleta / Factura electrónica</p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700 print:hidden"
        >
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      {/* Boleta imprimible */}
      <div className="mx-auto max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm print:max-w-none print:border-0 print:shadow-none">
        {/* Encabezado */}
        <div className="border-b-2 border-dashed border-neutral-300 pb-4 text-center">
          <p className="text-xl font-extrabold text-neutral-900">{business.name}</p>
          {business.razonSocial && <p className="text-sm text-neutral-600">{business.razonSocial}</p>}
          {business.ruc && <p className="text-sm font-semibold text-neutral-700">RUC: {business.ruc}</p>}
          {business.address && <p className="text-sm text-neutral-600">{business.address}</p>}
          {business.phone && <p className="text-sm text-neutral-600">Telf: {business.phone}</p>}
        </div>

        {/* Tipo de documento */}
        <div className="mt-3 border-b-2 border-dashed border-neutral-300 pb-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {isFactura ? "Factura electrónica" : "Boleta electrónica"}
          </p>
          <p className="font-mono text-2xl font-extrabold text-neutral-900">
            {documentNumber(doc.series, doc.number)}
          </p>
          <div className="mt-1 flex justify-center">
            <Badge className={st.color}>{st.label}</Badge>
          </div>
        </div>

        {/* Datos del cliente y fecha */}
        <div className="mt-3 space-y-1 border-b-2 border-dashed border-neutral-300 pb-3 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500">Fecha:</span>
            <span className="font-medium text-neutral-800">{formatDateTime(doc.createdAt)}</span>
          </div>
          {doc.customerDocNumber && (
            <div className="flex justify-between">
              <span className="text-neutral-500">{doc.customerDocType}:</span>
              <span className="font-medium text-neutral-800">{doc.customerDocNumber}</span>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <span className="text-neutral-500">Cliente:</span>
            <span className="text-right font-medium text-neutral-800">{doc.customerName}</span>
          </div>
        </div>

        {/* Detalle */}
        <div className="mt-3 border-b-2 border-dashed border-neutral-300 pb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-neutral-500">
                <th className="py-1">Producto</th>
                <th className="py-1 text-center">Cant.</th>
                <th className="py-1 text-right">Precio</th>
                <th className="py-1 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(doc.sale?.items ?? []).map((item) => (
                <tr key={item.id} className="border-t border-neutral-100">
                  <td className="py-1.5 pr-2 font-medium text-neutral-800">{item.name}</td>
                  <td className="py-1.5 text-center text-neutral-600">{Number(item.quantity)}</td>
                  <td className="py-1.5 text-right text-neutral-600">{formatSoles(item.price)}</td>
                  <td className="py-1.5 text-right font-semibold text-neutral-800">{formatSoles(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span>{formatSoles(doc.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>IGV (18%)</span>
            <span>{formatSoles(doc.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-neutral-200 pt-2 text-base">
            <span className="font-bold text-neutral-900">TOTAL</span>
            <span className="font-extrabold text-neutral-900">{formatSoles(doc.total)}</span>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-4 border-t border-dashed border-neutral-300 pt-3 text-center text-[11px] text-neutral-400">
          <p>NexoPyme — Tu negocio, tu sistema</p>
          {doc.cdrDescription && <p className="mt-1 text-neutral-500">{doc.cdrDescription}</p>}
          {doc.cdrCode && <p>CDR: {doc.cdrCode}</p>}
          <p className="mt-2">Gracias por su compra 🇵🇪</p>
        </div>
      </div>
    </AppShell>
  );
}