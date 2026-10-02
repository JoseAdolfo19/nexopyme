import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireBusiness } from "@/lib/auth";
import { scope } from "@/lib/prisma";

export async function GET() {
  const { business } = await requireBusiness();
  const db = scope(business.id);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sales = await db.sale.findMany({
    where: { businessId: business.id, status: "completada", createdAt: { gte: monthStart } },
    select: {
      saleNumber: true,
      createdAt: true,
      total: true,
      paymentMethod: true,
      customer: { select: { name: true, docType: true, docNumber: true } },
      documents: { select: { docType: true, series: true, number: true }, take: 1, orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = sales.map((sale) => ({
    Fecha: sale.createdAt.toLocaleString("es-PE"),
    Venta: sale.saleNumber,
    Cliente: sale.customer?.name ?? "Cliente ocasional",
    "Tipo documento cliente": sale.customer?.docType ?? "",
    "Documento cliente": sale.customer?.docNumber ?? "",
    "Tipo comprobante": sale.documents[0]?.docType ?? "",
    Serie: sale.documents[0]?.series ?? "",
    Número: sale.documents[0]?.number ?? "",
    "Método de pago": sale.paymentMethod,
    Total: Number(sale.total),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 21 },
    { wch: 18 },
    { wch: 30 },
    { wch: 24 },
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ventas-${now.toISOString().slice(0, 7)}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
