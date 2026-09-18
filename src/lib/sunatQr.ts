import QRCode from "qrcode";

const SUNAT_DOCUMENT_CODES: Record<string, string> = {
  factura: "01",
  boleta: "03",
};

const SUNAT_CUSTOMER_CODES: Record<string, string> = {
  DNI: "1",
  RUC: "6",
  CE: "4",
  PASAPORTE: "7",
  OTRO: "0",
};

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Genera la representación QR de una boleta/factura.
 * SUNAT podrá validarla cuando el CPE real esté firmado y enviado a SUNAT.
 */
export async function createSunatQr(input: {
  issuerRuc: string | null;
  docType: string;
  series: string;
  number: number;
  tax: unknown;
  total: unknown;
  issueDate: Date;
  customerDocType: string | null;
  customerDocNumber: string | null;
}): Promise<string | null> {
  const documentCode = SUNAT_DOCUMENT_CODES[input.docType];
  if (!documentCode || !input.issuerRuc) return null;

  const payload = [
    input.issuerRuc,
    documentCode,
    input.series,
    String(input.number).padStart(8, "0"),
    Number(input.tax).toFixed(2),
    Number(input.total).toFixed(2),
    formatDate(input.issueDate),
    SUNAT_CUSTOMER_CODES[input.customerDocType ?? ""] ?? "0",
    input.customerDocNumber ?? "",
  ].join("|");

  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 180,
  });
}