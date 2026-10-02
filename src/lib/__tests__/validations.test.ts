import { describe, it, expect } from "vitest";

import {
  registerSchema,
  loginSchema,
  businessSchema,
  branchSchema,
  customerSchema,
  productSchema,
  saleSchema,
  sunatConfigSchema,
} from "@/lib/validations";

describe("registerSchema", () => {
  const valid = {
    name: "Ana Pérez",
    email: "ana@example.com",
    password: "clave1234",
    passwordConfirm: "clave1234",
  };

  it("acepta un registro válido", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza contraseñas que no coinciden", () => {
    const r = registerSchema.safeParse({ ...valid, passwordConfirm: "otra" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toContain("passwordConfirm");
  });

  it("rechaza email inválido", () => {
    expect(registerSchema.safeParse({ ...valid, email: "no-es-correo" }).success).toBe(false);
  });

  it("rechaza contraseña corta (< 8)", () => {
    expect(registerSchema.safeParse({ ...valid, password: "corta", passwordConfirm: "corta" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("acepta credenciales válidas", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
  it("rechaza email inválido", () => {
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
  it("rechaza contraseña vacía", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("businessSchema", () => {
  it("acepta valores mínimos y aplica defaults reales", () => {
    const r = businessSchema.safeParse({ name: "Mi negocio", businessType: "restaurante" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.sellsProducts).toBe("productos");
      expect(r.data.employees).toBe(1);
      expect(r.data.needsInventory).toBe("si");
      expect(r.data.issuesDocuments).toBe("si");
      // city NO tiene default (es optional + literal): queda undefined.
      expect(r.data.city).toBeUndefined();
    }
  });
  it("rechaza RUC con longitud inválida", () => {
    const r = businessSchema.safeParse({ name: "Mi negocio", businessType: "t", ruc: "123" });
    expect(r.success).toBe(false);
  });
  it("acepta RUC vacío", () => {
    expect(businessSchema.safeParse({ name: "Mi negocio", businessType: "t", ruc: "" }).success).toBe(true);
  });
  it("rechaza nombre demasiado corto", () => {
    expect(businessSchema.safeParse({ name: "A", businessType: "t" }).success).toBe(false);
  });
});

describe("branchSchema", () => {
  it("normaliza y acepta datos válidos de sucursal", () => {
    const result = branchSchema.safeParse({ name: "  Centro  ", address: "", phone: "999 123 456" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Centro");
  });

  it("rechaza un nombre demasiado corto", () => {
    expect(branchSchema.safeParse({ name: "A" }).success).toBe(false);
  });
});

describe("customerSchema", () => {
  it("acepta un cliente válido", () => {
    expect(customerSchema.safeParse({ name: "Cliente" }).success).toBe(true);
  });
  it("rechaza nombre corto", () => {
    expect(customerSchema.safeParse({ name: "A" }).success).toBe(false);
  });
  it("rechaza email inválido", () => {
    expect(customerSchema.safeParse({ name: "Cliente", email: "bad" }).success).toBe(false);
  });
});

describe("productSchema", () => {
  it("acepta un producto válido con campos numéricos explícitos", () => {
    const r = productSchema.safeParse({ name: "Laptop", salePrice: 100, purchasePrice: 80 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.type).toBe("producto");
      expect(r.data.trackStock).toBe(true);
      expect(r.data.unit).toBe("UNIDAD");
    }
  });
  it("rechaza precio de venta negativo", () => {
    expect(productSchema.safeParse({ name: "P", salePrice: -1 }).success).toBe(false);
  });
  it("NO aplica default a salePrice al omitirlo (coerce -> NaN)", () => {
    // Comportamiento actual del schema: z.coerce.number().min(0).default(0)
    // convierte undefined en NaN antes de que el default pueda actuar.
    const r = productSchema.safeParse({ name: "Laptop" });
    expect(r.success).toBe(false);
    expect(r.error?.issues?.[0]?.path).toContain("salePrice");
  });
});

describe("saleSchema", () => {
  it("rechaza una venta sin items", () => {
    const r = saleSchema.safeParse({ paymentMethod: "efectivo", docType: "boleta", items: [] });
    expect(r.success).toBe(false);
  });
  it("rechaza cantidad no positiva", () => {
    const r = saleSchema.safeParse({
      paymentMethod: "efectivo",
      items: [{ productId: "p1", quantity: 0, price: 10 }],
    });
    expect(r.success).toBe(false);
  });
  it("acepta una venta con items válidos", () => {
    const r = saleSchema.safeParse({
      paymentMethod: "yape",
      items: [{ productId: "p1", quantity: 2, price: 25.5 }],
    });
    expect(r.success).toBe(true);
  });
});

describe("sunatConfigSchema", () => {
  it("aplica default real solo a environment (series son obligatorias)", () => {
    const r = sunatConfigSchema.safeParse({ ruc: "", seriesBoleta: "B001", seriesFactura: "F001" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.seriesBoleta).toBe("B001");
      expect(r.data.seriesFactura).toBe("F001");
      expect(r.data.environment).toBe("beta");
    }
  });
  it("rechaza series con formato inválido", () => {
    expect(sunatConfigSchema.safeParse({ seriesBoleta: "1234" }).success).toBe(false);
  });
  it("rechaza RUC inválido", () => {
    expect(sunatConfigSchema.safeParse({ ruc: "abc" }).success).toBe(false);
  });
  it("exige seriesBoleta/seriesFactura (no tienen default)", () => {
    // `environment` tiene default real, pero las series usan .or(z.literal(...)).
    const r = sunatConfigSchema.safeParse({ ruc: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues?.some((i) => i.path.join() === "seriesBoleta")).toBe(true);
  });
});