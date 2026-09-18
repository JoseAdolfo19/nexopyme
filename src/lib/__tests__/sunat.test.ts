import { describe, expect, it } from "vitest";
import { computeTotals } from "@/lib/sunat";

describe("computeTotals", () => {
  it.each(["boleta", "factura"] as const)("mantiene S/ 60 como total con IGV incluido para %s", (docType) => {
    expect(computeTotals(60, docType)).toEqual({
      subtotal: 50.85,
      tax: 9.15,
      total: 60,
    });
  });

  it("no agrega IGV a documentos internos", () => {
    expect(computeTotals(60, "nota_pedido")).toEqual({
      subtotal: 60,
      tax: 0,
      total: 60,
    });
  });
});