import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";
import type { Prisma } from "@/generated/prisma/client";

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
  docType: "boleta" | "factura" | "proforma" | "nota_pedido";
  customerDocType?: string | null;
  customerDocNumber?: string | null;
  customerName?: string | null;
  customerAddress?: string | null;
  totals: DocumentTotals;
};

/**
 * Tipos de documento que NO se envían a SUNAT (no son comprobantes electrónicos).
 * Solo se registran como documentos internos del negocio.
 */
export const INTERNAL_DOC_TYPES = ["proforma", "nota_pedido"] as const;

export type InternalDocType = (typeof INTERNAL_DOC_TYPES)[number];

export function isInternalDocType(value: string): value is InternalDocType {
  return (INTERNAL_DOC_TYPES as readonly string[]).includes(value);
}

/**
 * Calcula los totales de un documento.
 *
 * - factura: desglosa IGV 18% sobre el subtotal (precio SIN IGV).
 * - boleta: el precio ya incluye IGV, lo desglosa internamente para mostrar.
 * - proforma / nota_pedido: documentos internos sin tributación, no se
 *   desglosa IGV. El subtotal coincide con el total y el IGV va en 0.
 */
export function computeTotals(
  subtotalNet: number,
  docType: "boleta" | "factura" | "proforma" | "nota_pedido",
): DocumentTotals {
  if (docType === "factura") {
    const tax = round2(subtotalNet * 0.18);
    return { subtotal: round2(subtotalNet), tax, total: round2(subtotalNet + tax) };
  }
  if (docType === "boleta") {
    // Boleta: precio final ya incluye IGV.
    return { subtotal: round2(subtotalNet), tax: round2(subtotalNet * 0.18), total: round2(subtotalNet) };
  }
  // Documentos internos: sin IGV.
  return { subtotal: round2(subtotalNet), tax: 0, total: round2(subtotalNet) };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Serie según tipo de documento (configurable por negocio en el futuro). */
export function seriesFor(docType: "boleta" | "factura" | "proforma" | "nota_pedido"): string {
  if (docType === "boleta") return "B001";
  if (docType === "factura") return "F001";
  if (docType === "proforma") return "P001";
  return "NP001"; // nota_pedido
}

/** Obtiene el siguiente correlativo seguro para una serie (sin duplicados). */
export async function nextCorrelative(
  businessId: string,
  docType: "boleta" | "factura" | "proforma" | "nota_pedido",
  tx: Prisma.TransactionClient = prisma,
): Promise<number> {
  const series = seriesFor(docType);
  const last = await tx.document.findFirst({
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

  // Reserva del correlativo en una transacción con bloqueo de fila del negocio.
  // `SELECT ... FOR UPDATE` serializa las operaciones del mismo negocio, de modo
  // que dos ventas concurrentes no obtengan el mismo correlativo (evita chocar
  // con `@@unique([businessId, series, number])` y el hash único).
  const doc = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${input.businessId} FOR UPDATE`;

    const number = await nextCorrelative(input.businessId, input.docType, tx);

    const existing = await tx.document.findUnique({
      where: { businessId_series_number: { businessId: input.businessId, series, number } },
    });
    if (existing) return null; // idempotencia: no duplicar

    const hashInput = `${input.businessId}|${series}|${number}|${input.totals.total}|${input.customerDocNumber ?? "N/A"}`;
    const hash = computeHash(hashInput);

    return tx.document.create({
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
  });

  if (!doc) return null;

  // Disparar envío (en MVP: simulación BETA síncrona) fuera de la transacción.
  await submitDocument(doc.id);

  return { id: doc.id, series: doc.series, number: doc.number };
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

  // Documentos internos (proforma, nota_pedido) NO se envían a SUNAT.
  // Solo se registran como referencia interna del negocio.
  if (isInternalDocType(doc.docType)) {
    await prisma.document.update({
      where: { id: doc.id },
      data: {
        status: "aceptado",
        cdrCode: "INTERNO",
        cdrDescription: "Documento interno — no requiere envío a SUNAT.",
      },
    });
    return;
  }

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
  // Aquí se conectará el cliente SOAP/FTP oficial de SUNAT o el PSE elegido.
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