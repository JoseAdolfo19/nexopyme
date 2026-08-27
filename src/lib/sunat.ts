import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

/**
 * Servicio de comprobantes electrónicos (SUNAT).
 *
 * ⚠️ IMPORTANTE (Requisito #42 del spec):
 * La integración real con SUNAT requiere investigar la documentación oficial
 * vigente: servicios SEE del contribuyente u OSE, UBL 2.1, firma digital,
 * CDR, códigos de error y reglas de contingencia. NO se inventan endpoints
 * ni estructuras XML aquí.
 *
 * En este MVP el envío opera en modo BETA simulado:
 * - Genera el número de serie correlativo y el hash del documento.
 * - Simula la respuesta de SUNAT marcando el documento como "aceptado".
 * - Deja registrado el estado en `sunat_submissions` para que el envío real
 *   se conecte en el mismo punto sin cambiar el flujo de datos.
 *
 * Estados contemplados: pendiente → enviando → aceptado | rechazado | error
 * Reintentos: job/queue que vuelve a intentar los documentos "pendiente".
 */

export type DocumentTotals = {
  subtotal: number;
  tax: number;
  total: number;
};

export type DocumentInput = {
  businessId: string;
  saleId?: string;
  customerId?: string;
  docType: "boleta" | "factura";
  customerDocType?: string | null;
  customerDocNumber?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  totals: DocumentTotals;
};

export function computeTotals(subtotalNet: number, docType: "boleta" | "factura"): DocumentTotals {
  // IGV 18%: solo se desglosa en facturas (la boleta va con IGV incluido).
  if (docType === "factura") {
    const tax = round2(subtotalNet * 0.18);
    return { subtotal: round2(subtotalNet), tax, total: round2(subtotalNet + tax) };
  }
  // Boleta: precio final ya incluye IGV.
  return { subtotal: round2(subtotalNet), tax: round2(subtotalNet * 0.18), total: round2(subtotalNet) };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Serie según tipo de documento (configurable por negocio en el futuro). */
export function seriesFor(docType: "boleta" | "factura"): string {
  return docType === "boleta" ? "B001" : "F001";
}

/** Obtiene el siguiente correlativo seguro para una serie (sin duplicados). */
export async function nextCorrelative(businessId: string, docType: "boleta" | "factura"): Promise<number> {
  const series = seriesFor(docType);
  const last = await prisma.document.findFirst({
    where: { businessId, series },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  return (last?.number ?? 0) + 1;
}

export function computeHash(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Crea el comprobante en BD con estado "pendiente" y dispara el envío.
 * Idempotencia: si ya existe un documento con (businessId, serie, number)
 * devuelve null para no duplicar.
 */
export async function createDocument(input: DocumentInput): Promise<{ id: string; series: string; number: number } | null> {
  const series = seriesFor(input.docType);
  const number = await nextCorrelative(input.businessId, input.docType);

  const existing = await prisma.document.findUnique({
    where: { businessId_series_number: { businessId: input.businessId, series, number } },
  });
  if (existing) return null; // idempotencia: no duplicar

  const hashInput = `${input.businessId}|${series}|${number}|${input.totals.total}|${input.customerDocNumber ?? "N/A"}`;
  const hash = computeHash(hashInput);

  const doc = await prisma.document.create({
    data: {
      businessId: input.businessId,
      saleId: input.saleId ?? null,
      customerId: input.customerId ?? null,
      docType: input.docType,
      series,
      number,
      issueDate: new Date(),
      customerDocType: input.customerDocType ?? null,
      customerDocNumber: input.customerDocNumber ?? null,
      customerName: input.customerName ?? null,
      customerAddress: input.customerAddress ?? null,
      subtotal: input.totals.subtotal,
      tax: input.totals.tax,
      total: input.totals.total,
      status: "pendiente",
      hash,
    },
  });

  // Disparar envío (en MVP: simulación BETA síncrona).
  await submitDocument(doc.id);

  return { id: doc.id, series, number };
}

/**
 * Envía el documento a SUNAT.
 *
 * MODO BETA (MVP): simula la aceptación. Cuando se implemente la integración
 * real (SEE del contribuyente u OSE), este método debe:
 *   1. Generar el XML UBL 2.1 según esquema oficial.
 *   2. Firmar el XML con el certificado digital del negocio.
 *   3. Enviar por el servicio oficial (SOAP/FTP/HTTP según el SEE usado).
 *   4. Guardar el CDR recibido.
 * El estado y el reintento automático ya están modelados aquí.
 */
export async function submitDocument(documentId: string): Promise<void> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return;
  if (doc.status === "aceptado" || doc.status === "aceptado_observacion") return;

  const settings = (await prisma.business.findUnique({
    where: { id: doc.businessId },
    select: { settings: true },
  }))?.settings as { sunat?: { environment?: string } } | null;

  const environment = settings?.sunat?.environment ?? "beta";

  await prisma.document.update({ where: { id: doc.id }, data: { status: "enviando" } });
  await prisma.sunatSubmission.create({
    data: {
      businessId: doc.businessId,
      documentId: doc.id,
      attempt: 1,
      status: "enviando",
      endpoint: environment === "beta" ? "SIMULADO-BETA" : "SIMULADO-PROD",
    },
  });

  // ---- PUNTO DE INTEGRACIÓN REAL ----
  // Aquí se conectará el cliente SOAP/FTP oficial de SUNAT.
  // Por ahora: simulación de respuesta exitosa en ambiente BETA.
  // -------------------------------------
  const simulatedCdrCode = "0";
  const simulatedDescription = "La comunicación con SUNAT se realizará al activar la integración oficial (ver documentación vigente). Estado simulado en ambiente BETA.";

  const ok = environment === "beta" && simulatedCdrCode === "0";

  await prisma.$transaction(async (tx) => {
    await tx.sunatSubmission.updateMany({
      where: { documentId: doc.id, status: "enviando" },
      data: {
        status: ok ? "aceptado" : "rechazado",
        responsePayload: JSON.stringify({ simulated: true, cdrCode: simulatedCdrCode }),
        errorMessage: ok ? null : simulatedDescription,
      },
    });
    await tx.sunatResponse.create({
      data: {
        businessId: doc.businessId,
        documentId: doc.id,
        cdrCode: simulatedCdrCode,
        cdrDescription: simulatedDescription,
        rawResponse: JSON.stringify({ simulated: true, environment, cdrCode: simulatedCdrCode }),
      },
    });
    await tx.document.update({
      where: { id: doc.id },
      data: {
        status: ok ? "aceptado" : "rechazado",
        cdrCode: simulatedCdrCode,
        cdrDescription: simulatedDescription,
        sunatResponse: JSON.stringify({ simulated: true, environment }),
      },
    });
  });
}

/** Serializa el documento para representar en PDF/HTML (formato boleta simple). */
export function documentNumber(series: string, number: number): string {
  return `${series}-${String(number).padStart(8, "0")}`;
}