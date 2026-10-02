"use client";

import { useActionState, useState } from "react";
import { sendDocumentEmailAction } from "@/app/actions/documents";

export default function DocumentDelivery({
  documentId,
  documentNumber,
  customerName,
  customerEmail,
  customerPhone,
  total,
}: {
  documentId: string;
  documentNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  total: string;
}) {
  const [state, action, pending] = useActionState(sendDocumentEmailAction, {});
  const [shareError, setShareError] = useState("");
  const pdfUrl = `/api/comprobantes/${encodeURIComponent(documentId)}/pdf`;
  const message = `Hola ${customerName}, te compartimos tu comprobante ${documentNumber} por ${total}.`;

  async function shareOnWhatsApp() {
    setShareError("");
    const phone = customerPhone?.replace(/\D/g, "") ?? "";
    const waPhone = phone.length === 9 ? `51${phone}` : phone;

    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error("No se pudo generar el PDF.");
      const file = new File([await response.blob()], `${documentNumber}.pdf`, { type: "application/pdf" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Comprobante ${documentNumber}`, text: message });
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(file);
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
      window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    } catch {
      setShareError("No se pudo preparar el PDF para compartir.");
    }
  }

  return (
    <div className="print:hidden">
      <div className="flex flex-wrap gap-2">
        <a href={pdfUrl} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          Descargar PDF
        </a>
        <button type="button" onClick={shareOnWhatsApp} className="rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
          Compartir por WhatsApp
        </button>
        <form action={action}>
          <input type="hidden" name="document_id" value={documentId} />
          <button
            type="submit"
            disabled={pending || !customerEmail}
            title={!customerEmail ? "Registra un correo en la ficha del cliente" : undefined}
            className="rounded-lg border border-brand-700 bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Enviando…" : "Enviar por correo"}
          </button>
        </form>
      </div>
      {!customerEmail && <p className="mt-2 text-xs text-neutral-500">El cliente no tiene correo registrado.</p>}
      {state.error && <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="mt-2 text-sm text-emerald-700">{state.ok}</p>}
      {shareError && <p role="alert" className="mt-2 text-sm text-red-700">{shareError}</p>}
    </div>
  );
}