import { describe, expect, it } from "vitest";
import { PLAN_CATALOG } from "@/lib/constants";

describe("catálogo de planes", () => {
  it("incluye los cupos acordados y el plan Multi-Sucursal", () => {
    expect(PLAN_CATALOG.map(({ code }) => code)).toEqual([
      "free",
      "emprendedor",
      "negocio",
      "multi_sucursal",
      "pro",
    ]);
    expect(PLAN_CATALOG.map(({ limits }) => limits.documents)).toEqual([
      50,
      500,
      5000,
      5000,
      50000,
    ]);
    expect(PLAN_CATALOG.find(({ code }) => code === "multi_sucursal")?.limits.branches).toBe(5);
  });
});