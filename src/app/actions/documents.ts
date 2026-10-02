"use server";

import { requireBusiness } from "@/lib/auth";
import { scope } from "@/lib/prisma";
import { createDocumentPdf } from "@/lib/documentPdf";
import { documentNumber } from "@/lib/sunat";
import { isEmailDeliveryConfigured, sendEmail } from "@/lib/mailer";

type DeliveryState = { error?: string; ok?: string };

export async function sendDocumentEmailAction(
  _prev: DeliveryState,
  formData: FormData,
): Promise<DeliveryState> {
  const { business } = await requireBusiness();
  const documentId = String(formData.get("document_id") ?? "");
  if (!documentId || documentId.length > 64) return { error: "Comprobante no válido." };
  if (!isEmailDeliveryConfigured()) {
    return { error: "El envío de correo no está configurado. Falta habilitar Resend en el entorno del servidor." };
  }

  const pdf = await createDocumentPdf(business, documentId);
  if (!pdf) return { error: "No encontramos ese comprobante en este negocio." };

  const customer = pdf.receipt.customerId
    ? await scope(business.id).customer.findFirst({
        where: { id: pdf.receipt.customerId, businessId: business.id },
        select: { email: true },
      })
    : null;
  const email = customer?.email?.trim();
  if (!email) return { error: "El cliente no tiene un correo registrado." };

  try {
    await sendEmail({
      to: email,
      subject: `Tu comprobante ${documentNumber(pdf.receipt.series, pdf.receipt.number)} — Tienda Plus`,
      html: `<p>Hola,</p><p>Adjuntamos tu comprobante de <strong>${business.name}</strong>.</p>`,
      text: `Adjuntamos tu comprobante ${documentNumber(pdf.receipt.series, pdf.receipt.number)} de ${business.name}.`,
      attachments: [{ filename: pdf.filename, content: pdf.buffer.toString("base64"), contentType: "application/pdf" }],
    });
  } catch (error) {
    console.error("[documents] No se pudo enviar el comprobante por email:", error);
    return { error: "No se pudo enviar el correo. Inténtalo nuevamente." };
  }

  return { ok: `Comprobante enviado a ${email}.` };
}