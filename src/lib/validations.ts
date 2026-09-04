import { z } from "zod";

// ==================== AUTH ====================

export const registerSchema = z.object({
  name: z.string().min(2, "Ingresa tu nombre completo").max(100),
  email: z.string().email("Ingresa un correo válido").max(190),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Las contraseñas no coinciden",
  path: ["passwordConfirm"],
});

export const loginSchema = z.object({
  email: z.string().email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

// ==================== ONBOARDING / NEGOCIO ====================

export const businessSchema = z.object({
  name: z.string().min(2, "Ingresa el nombre de tu negocio").max(120),
  businessType: z.string().min(1, "Selecciona tu tipo de negocio"),
  sellsProducts: z.enum(["productos", "servicios", "ambos"]).default("productos"),
  needsInventory: z.enum(["si", "no"]).default("si"),
  needsAppointments: z.enum(["si", "no"]).default("no"),
  needsTables: z.enum(["si", "no"]).default("no"),
  employees: z.coerce.number().int().min(1).max(1000).default(1),
  issuesDocuments: z.enum(["si", "no"]).default("si"),
  ruc: z.string().regex(/^\d{11}$/, "El RUC debe tener 11 dígitos").optional().or(z.literal("")),
  razonSocial: z.string().max(120).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("Urubamba")),
});

// ==================== CLIENTES ====================

export const customerSchema = z.object({
  docType: z.enum(["DNI", "RUC", "CE", "PASAPORTE", "OTRO"]).default("DNI"),
  docNumber: z.string().max(20).optional().or(z.literal("")),
  name: z.string().min(2, "Ingresa el nombre del cliente").max(150),
  email: z.string().email("Correo inválido").optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

// ==================== PRODUCTOS ====================

export const productSchema = z.object({
  name: z.string().min(2, "Ingresa el nombre").max(150),
  description: z.string().max(1000).optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  code: z.string().max(50).optional().or(z.literal("")),
  barcode: z.string().max(50).optional().or(z.literal("")),
  brand: z.string().max(80).optional().or(z.literal("")),
  type: z.enum(["producto", "servicio"]).default("producto"),
  unit: z.string().max(20).default("UNIDAD"),
  purchasePrice: z.coerce.number().min(0).default(0),
  salePrice: z.coerce.number().min(0, "El precio de venta no puede ser negativo"),
  stock: z.coerce.number().min(0).default(0),
  minStock: z.coerce.number().min(0).default(0),
  trackStock: z.boolean().default(true),
  attributes: z.record(z.string(), z.string()).optional(),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Ingresa el nombre de la categoría").max(80),
  type: z.enum(["producto", "servicio"]).default("producto"),
});

// ==================== VENTAS ====================

export const saleSchema = z.object({
  customerId: z.string().optional().or(z.literal("")),
  paymentMethod: z.enum(["efectivo", "yape", "plin", "tarjeta", "transferencia", "credito", "otro"]),
  docType: z.enum(["boleta", "factura", "proforma", "nota_pedido"]).default("boleta"),
  notes: z.string().max(500).optional().or(z.literal("")),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.coerce.number().positive("Cantidad debe ser mayor a 0"),
    price: z.coerce.number().min(0),
  })).min(1, "Agrega al menos un producto"),
});

// ==================== CONFIGURACIÓN SUNAT ====================

export const sunatConfigSchema = z.object({
  ruc: z.string().regex(/^\d{11}$/, "El RUC debe tener 11 dígitos").or(z.literal("")),
  razonSocial: z.string().max(150).optional().or(z.literal("")),
  sunatUser: z.string().max(60).optional().or(z.literal("")),
  sunatPassword: z.string().max(60).optional().or(z.literal("")),
  seriesBoleta: z.string().regex(/^[A-Z]{1}\d{3}$/, "Formato: B001").or(z.literal("B001")),
  seriesFactura: z.string().regex(/^[A-Z]{1}\d{3}$/, "Formato: F001").or(z.literal("F001")),
  environment: z.enum(["beta", "produccion"]).default("beta"),
  certificatePassword: z.string().max(60).optional().or(z.literal("")),
});