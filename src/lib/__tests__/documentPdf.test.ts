import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock } = vi.hoisted(() => ({ findFirstMock: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  scope: () => ({ document: { findFirst: findFirstMock } }),
}));
vi.mock("@/lib/sunatQr", () => ({ createSunatQr: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/sunat", () => ({
  documentNumber: (series: string, number: number) => `${series}-${String(number).padStart(6, "0")}`,
}));

import { createDocumentPdf } from "@/lib/documentPdf";

describe("createDocumentPdf", () => {
  beforeEach(() => {
    findFirstMock.mockResolvedValue({
      id: "doc_1",
      businessId: "biz_1",
      docType: "boleta",
      series: "B001",
      number: 1,
      issueDate: new Date("2026-10-02T12:00:00Z"),
      tax: 1.53,
      total: 10,
      customerDocType: "DNI",
      customerDocNumber: "12345678",
      customerId: null,
      customerAddress: null,
      customerName: "Cliente Demo",
      subtotal: 8.47,
      customer: null,
      sale: {
        items: [{ name: "Producto de prueba", quantity: 1, price: 10, subtotal: 10 }],
      },
    });
  });

  it("genera un PDF descargable y limita la búsqueda al negocio", async () => {
    const result = await createDocumentPdf({
      id: "biz_1",
      name: "Tienda Plus",
      razonSocial: null,
      ruc: null,
      address: null,
      phone: null,
    }, "doc_1");

    expect(result?.buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(result?.filename).toBe("B001-000001.pdf");
    expect(findFirstMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "doc_1", businessId: "biz_1" },
    }));
  });
});