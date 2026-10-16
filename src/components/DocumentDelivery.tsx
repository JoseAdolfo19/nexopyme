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

  const phone = customerPhone?.replace(/\D/g, "") ?? "";
  const waPhone = phone.length === 9 ? `51${phone}` : phone;
  const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;

  async function handleWhatsAppClick(event: React.MouseEvent<HTMLAnchorElement>) {
    setShareError("");

    // Descargar el PDF en segundo plano (sin bloquear el enlace).
    let file: File | null = null;
    try {
      const response = await fetch(pdfUrl);
      if (response.ok) {
        file = new File([await response.blob()], `${documentNumber}.pdf`, { type: "application/pdf" });
      }
    } catch {
      file = null;
    }

    // Móvil con Web Share API: adjunta el PDF directamente en WhatsApp.
    if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
      event.preventDefault(); // el enlace no navega; usamos el share nativo
      try {
        await navigator.share({ files: [file], title: `Comprobante ${documentNumber}`, text: message });
        return;
      } catch {
        // El usuario canceló el share o falló: no mostrar error, el enlace
        // ya no navegará porque hicimos preventDefault. Reintentamos con wa.me.
        window.open(waUrl, "_blank", "noopener,noreferrer");
        return;
      }
    }

    // Escritorio: el <a> abre WhatsApp con el mensaje (gesto nativo del
    // usuario, los navegadores no lo bloquean). El PDF se descarga aparte
    // para que se adjunte manualmente (wa.me no permite adjuntar archivos).
    if (file) {
      const anchor = document.createElement("a");
      anchor.href = URL.createObjectURL(file);
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    } else if (!navigator.share) {
      setShareError("No se pudo preparar el PDF para compartir.");
    }
  }

  const whatsappButton = phone ? (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleWhatsAppClick}
      className="rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
    >
      Compartir por WhatsApp
    </a>
  ) : (
    <button
      type="button"
      disabled
      title="Registra un celular en la ficha del cliente"
      className="cursor-not-allowed rounded-lg border border-emerald-700 bg-emerald-700 px-3 py-2 text-sm font-semibold text-white opacity-50"
    >
      Compartir por WhatsApp
    </button>
  );

  return (
    <div className="print:hidden">
      <div className="flex flex-wrap gap-2">
        <a href={pdfUrl} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">
          Descargar PDF
        </a>
        {whatsappButton}
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
      {!phone && <p className="mt-2 text-xs text-neutral-500">El cliente no tiene celular registrado.</p>}
      {state.error && <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="mt-2 text-sm text-emerald-700">{state.ok}</p>}
      {shareError && <p role="alert" className="mt-2 text-sm text-red-700">{shareError}</p>}
    </div>
  );
}
