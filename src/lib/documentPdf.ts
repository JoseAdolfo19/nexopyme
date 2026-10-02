import "server-only";

import PDFDocument from "pdfkit";
import { documentTypeLabel } from "@/lib/constants";
import { formatDateTime, formatSoles } from "@/lib/format";
import { documentNumber } from "@/lib/sunat";
import { createSunatQr } from "@/lib/sunatQr";
import { scope } from "@/lib/prisma";

type BusinessDetails = {
  id: string;
  name: string;
  razonSocial: string | null;
  ruc: string | null;
  address: string | null;
  phone: string | null;
};

export async function createDocumentPdf(business: BusinessDetails, documentId: string) {
  const db = scope(business.id);
  const receipt = await db.document.findFirst({
    where: { id: documentId, businessId: business.id },
    include: {
      customer: { select: { email: true, phone: true } },
      sale: { include: { items: true } },
    },
  });
  if (!receipt) return null;

  const qrDataUrl = ["boleta", "factura"].includes(receipt.docType)
    ? await createSunatQr({
        issuerRuc: business.ruc,
        docType: receipt.docType,
        series: receipt.series,
        number: receipt.number,
        tax: receipt.tax,
        total: receipt.total,
        issueDate: receipt.issueDate,
        customerDocType: receipt.customerDocType,
        customerDocNumber: receipt.customerDocNumber,
      })
    : null;

  const pdf = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];
  const buffer = new Promise<Buffer>((resolve, reject) => {
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });

  pdf.info.Title = `${documentTypeLabel(receipt.docType)} ${documentNumber(receipt.series, receipt.number)}`;
  pdf.info.Author = business.name;
  pdf.font("Helvetica-Bold").fontSize(20).fillColor("#111827").text(business.name);
  if (business.razonSocial) pdf.font("Helvetica").fontSize(10).text(business.razonSocial);
  if (business.ruc) pdf.text(`RUC: ${business.ruc}`);
  if (business.address) pdf.text(business.address);
  if (business.phone) pdf.text(`Teléfono: ${business.phone}`);

  pdf.moveDown(1);
  pdf.moveTo(48, pdf.y).lineTo(547, pdf.y).strokeColor("#d1d5db").stroke();
  pdf.moveDown(1);
  pdf.font("Helvetica-Bold").fontSize(15).fillColor("#111827")
    .text(documentTypeLabel(receipt.docType).toUpperCase());
  pdf.font("Helvetica").fontSize(12).text(documentNumber(receipt.series, receipt.number));
  pdf.fontSize(10).fillColor("#4b5563").text(`Fecha: ${formatDateTime(receipt.issueDate)}`);
  pdf.text(`Cliente: ${receipt.customerName ?? "CLIENTE VARIOS"}`);
  if (receipt.customerDocNumber) pdf.text(`${receipt.customerDocType ?? "Documento"}: ${receipt.customerDocNumber}`);
  if (receipt.customerAddress) pdf.text(receipt.customerAddress);

  pdf.moveDown(1.5);
  const drawTableHeader = () => {
    const y = pdf.y;
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#374151");
    pdf.text("Producto", 48, y, { width: 255 });
    pdf.text("Cant.", 316, y, { width: 45, align: "right" });
    pdf.text("Precio", 370, y, { width: 75, align: "right" });
    pdf.text("Total", 450, y, { width: 97, align: "right" });
    pdf.y = y + 16;
    pdf.moveTo(48, pdf.y).lineTo(547, pdf.y).strokeColor("#d1d5db").stroke();
    pdf.y += 8;
  };
  drawTableHeader();

  for (const item of receipt.sale?.items ?? []) {
    const rowHeight = Math.max(20, pdf.heightOfString(item.name, { width: 255 }) + 6);
    if (pdf.y + rowHeight > 735) {
      pdf.addPage();
      drawTableHeader();
    }
    const y = pdf.y;
    pdf.font("Helvetica").fontSize(9).fillColor("#111827").text(item.name, 48, y, { width: 255 });
    pdf.text(String(Number(item.quantity)), 316, y, { width: 45, align: "right" });
    pdf.text(formatSoles(item.price), 370, y, { width: 75, align: "right" });
    pdf.text(formatSoles(item.subtotal), 450, y, { width: 97, align: "right" });
    pdf.y = y + rowHeight;
  }

  if (pdf.y + 110 > 735) pdf.addPage();
  pdf.moveDown(1);
  pdf.moveTo(330, pdf.y).lineTo(547, pdf.y).strokeColor("#d1d5db").stroke();
  pdf.moveDown(0.7);
  pdf.font("Helvetica").fontSize(10).fillColor("#4b5563").text(`Subtotal  ${formatSoles(receipt.subtotal)}`, 330, pdf.y, { width: 217, align: "right" });
  pdf.moveDown(0.5);
  pdf.text(`IGV  ${formatSoles(receipt.tax)}`, 330, pdf.y, { width: 217, align: "right" });
  pdf.moveDown(0.6);
  pdf.font("Helvetica-Bold").fontSize(13).fillColor("#111827")
    .text(`TOTAL  ${formatSoles(receipt.total)}`, 330, pdf.y, { width: 217, align: "right" });

  if (qrDataUrl && pdf.y + 120 < 780) {
    const qrImage = Buffer.from(qrDataUrl.split(",")[1] ?? "", "base64");
    if (qrImage.length) pdf.image(qrImage, 48, pdf.y + 12, { fit: [96, 96] });
  }
  pdf.end();

  return {
    buffer: await buffer,
    receipt,
    filename: `${documentNumber(receipt.series, receipt.number)}.pdf`,
  };
}