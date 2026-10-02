import { describe, expect, it } from "vitest";
import { PLAN_CATALOG } from "@/lib/constants";

describe("catálogo de planes", () => {
  it("incluye los cuatro planes, precios y cupos acordados", () => {
    expect(PLAN_CATALOG.map(({ code }) => code)).toEqual([
      "free",
      "emprendedor",
      "negocio",
      "pro",
    ]);
    expect(PLAN_CATALOG.map(({ limits }) => limits.documents)).toEqual([
      10,
      100,
      null,
      null,
    ]);
    expect(PLAN_CATALOG.map(({ price }) => price)).toEqual([0, 49, 119, 249]);
    expect(PLAN_CATALOG.find(({ code }) => code === "negocio")?.limits.branches).toBe(3);
    expect(PLAN_CATALOG.find(({ code }) => code === "pro")?.limits.users).toBeNull();
  });

  it("activa el código de barras solo en rubros comerciales compatibles", async () => {
    const { supportsProductBarcodes } = await import("@/lib/constants");
    expect(supportsProductBarcodes("bodega")).toBe(true);
    expect(supportsProductBarcodes("minimarket")).toBe(true);
    expect(supportsProductBarcodes("restaurante")).toBe(false);
  });
});