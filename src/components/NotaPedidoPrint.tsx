import { formatDateTime, formatSoles } from "@/lib/format";
import { documentNumber } from "@/lib/sunat";

type OrderDocument = {
  series: string;
  number: number;
  createdAt: Date;
  customerDocType: string | null;
  customerDocNumber: string | null;
  customerName: string | null;
  customerAddress: string | null;
  total: unknown;
  sale: {
    paymentMethod: string;
    items: Array<{
      id: string;
      name: string;
      quantity: unknown;
      price: unknown;
      subtotal: unknown;
      unit?: string;
    }>;
  } | null;
};

type BusinessHeader = {
  name: string;
  razonSocial: string | null;
  ruc: string | null;
  address: string | null;
  phone: string | null;
};

export default function NotaPedidoPrint({ business, document }: { business: BusinessHeader; document: OrderDocument }) {
  return (
    <div className="print-document print-note-order mx-auto max-w-3xl rounded-xl border border-neutral-300 bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:border print:p-8 print:shadow-none">
      <div className="flex items-start justify-between gap-8 border-b border-neutral-400 pb-5">
        <div className="flex h-20 w-48 items-center justify-center border border-neutral-400 text-center text-xs text-neutral-400">
          LOGO
        </div>
        <div className="text-right text-sm text-neutral-700">
          <p>RUC: {business.ruc ?? "________________"}</p>
          <p>Fecha: {formatDateTime(document.createdAt)}</p>
          <p>N°: {documentNumber(document.series, document.number)}</p>
        </div>
      </div>

      <h2 className="my-6 text-center text-2xl font-extrabold tracking-wide text-neutral-900">NOTA DE PEDIDO</h2>

      <div className="mb-5 grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-neutral-700">
        <p className="col-span-2"><strong>Cliente:</strong> {document.customerName ?? "Cliente ocasional"}</p>
        <p><strong>{document.customerDocType ?? "Documento"}:</strong> {document.customerDocNumber ?? "—"}</p>
        <p><strong>Dirección:</strong> {document.customerAddress ?? "—"}</p>
        <p><strong>Condiciones de pago:</strong> {document.sale?.paymentMethod ?? "—"}</p>
        <p><strong>Empresa:</strong> {business.razonSocial ?? business.name}</p>
      </div>

      <table className="w-full border-collapse border border-neutral-500 text-sm">
        <thead>
          <tr className="bg-neutral-200 text-left text-neutral-800">
            <th className="border border-neutral-500 px-3 py-2">Cantidad</th>
            <th className="border border-neutral-500 px-3 py-2">Concepto / Descripción</th>
            <th className="border border-neutral-500 px-3 py-2 text-right">Precio unitario</th>
            <th className="border border-neutral-500 px-3 py-2 text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          {(document.sale?.items ?? []).map((item) => (
            <tr key={item.id} className="h-10">
              <td className="border border-neutral-500 px-3 py-2">{Number(item.quantity)} {item.unit ?? "UNIDAD"}</td>
              <td className="border border-neutral-500 px-3 py-2">{item.name}</td>
              <td className="border border-neutral-500 px-3 py-2 text-right">{formatSoles(item.price)}</td>
              <td className="border border-neutral-500 px-3 py-2 text-right">{formatSoles(item.subtotal)}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 5 - (document.sale?.items.length ?? 0)) }).map((_, index) => (
            <tr key={`empty-${index}`} className="h-10">
              <td className="border border-neutral-500 px-3 py-2">&nbsp;</td>
              <td className="border border-neutral-500 px-3 py-2" />
              <td className="border border-neutral-500 px-3 py-2" />
              <td className="border border-neutral-500 px-3 py-2" />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 flex justify-end text-lg font-bold">Total: {formatSoles(document.total)}</div>

      <div className="mt-24 grid grid-cols-2 gap-20 text-center text-sm text-neutral-700">
        <div className="border-t border-neutral-500 pt-2">Firma empresa compradora</div>
        <div className="border-t border-neutral-500 pt-2">Firma empresa vendedora</div>
      </div>

      <div className="mt-8 text-center text-xs text-neutral-500">
        {business.name} · {business.address ?? ""} · {business.phone ?? ""}
        <p className="mt-1 font-semibold">Documento interno — no tiene valor tributario</p>
      </div>
    </div>
  );
}
