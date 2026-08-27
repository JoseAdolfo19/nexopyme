export const BUSINESS_TYPES = [
  { value: "artesania", label: "Artesanía", emoji: "🧶" },
  { value: "tienda", label: "Tienda", emoji: "🏪" },
  { value: "ropa", label: "Ropa", emoji: "👕" },
  { value: "bodega", label: "Bodega", emoji: "🏬" },
  { value: "minimarket", label: "Minimarket", emoji: "🛒" },
  { value: "restaurante", label: "Restaurante", emoji: "🍽️" },
  { value: "cafeteria", label: "Cafetería", emoji: "☕" },
  { value: "panaderia", label: "Panadería", emoji: "🥖" },
  { value: "ferreteria", label: "Ferretería", emoji: "🔧" },
  { value: "salon_belleza", label: "Salón de belleza", emoji: "💇" },
  { value: "taller", label: "Taller", emoji: "🛠️" },
  { value: "servicios", label: "Servicios profesionales", emoji: "💼" },
  { value: "online", label: "Emprendimiento online", emoji: "🌐" },
  { value: "otro", label: "Otro", emoji: "📦" },
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

export function businessTypeLabel(value: string): string {
  return BUSINESS_TYPES.find((t) => t.value === value)?.label ?? "Otro";
}

/**
 * Configuración inteligente: qué módulos activar según el tipo de negocio.
 * El núcleo común siempre incluye ventas, clientes, productos, inventario
 * y reportes. Los módulos especializados se agregan por tipo.
 */
export function modulesForType(businessType: string): string[] {
  const core = [
    "dashboard",
    "ventas",
    "clientes",
    "productos",
    "comprobantes",
    "reportes",
  ];

  const extras: Record<string, string[]> = {
    restaurante: ["inventario", "mesas", "comandas", "cocina", "ingredientes"],
    cafeteria: ["inventario", "mesas"],
    panaderia: ["inventario"],
    ropa: ["inventario", "variantes", "tallas", "colores"],
    artesania: ["inventario", "catalogo", "categorias"],
    bodega: ["inventario", "compras", "proveedores"],
    minimarket: ["inventario", "compras", "proveedores"],
    ferreteria: ["inventario", "compras", "proveedores"],
    salon_belleza: ["servicios", "agenda", "profesionales", "citas"],
    taller: ["inventario", "servicios"],
    servicios: ["servicios", "agenda", "citas"],
    online: ["inventario", "catalogo"],
    tienda: ["inventario"],
  };

  const extra = extras[businessType] ?? [];
  return Array.from(new Set([...core, ...extra]));
}

/** Módulos que se muestran en el menú de la app (con etiquetas sencillas). */
export const MODULE_MENU: Record<string, { label: string; href: string; emoji: string }> = {
  dashboard: { label: "Inicio", href: "/dashboard", emoji: "🏠" },
  ventas: { label: "Nueva venta", href: "/ventas", emoji: "🧾" },
  productos: { label: "Mis productos", href: "/productos", emoji: "📦" },
  inventario: { label: "Inventario", href: "/inventario", emoji: "📊" },
  clientes: { label: "Clientes", href: "/clientes", emoji: "👥" },
  comprobantes: { label: "Comprobantes", href: "/comprobantes", emoji: "📄" },
  reportes: { label: "Reportes", href: "/reportes", emoji: "📈" },
  compras: { label: "Compras", href: "/compras", emoji: "🛍️" },
  proveedores: { label: "Proveedores", href: "/proveedores", emoji: "🚚" },
  caja: { label: "Caja", href: "/caja", emoji: "💰" },
  configuracion: { label: "Configuración", href: "/configuracion", emoji: "⚙️" },
};

export const PAYMENT_METHODS = [
  { value: "efectivo", label: "Efectivo", emoji: "💵" },
  { value: "yape", label: "Yape", emoji: "📱" },
  { value: "plin", label: "Plin", emoji: "📱" },
  { value: "tarjeta", label: "Tarjeta", emoji: "💳" },
  { value: "transferencia", label: "Transferencia", emoji: "🏦" },
  { value: "credito", label: "Crédito", emoji: "🤝" },
  { value: "otro", label: "Otro", emoji: "🔁" },
] as const;

export function paymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}

export const DOCUMENT_TYPES = [
  { value: "boleta", label: "Boleta" },
  { value: "factura", label: "Factura" },
  { value: "nota_credito", label: "Nota de crédito" },
  { value: "nota_debito", label: "Nota de débito" },
] as const;

export const DOCUMENT_STATUS: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-800" },
  enviando: { label: "Enviando", color: "bg-blue-100 text-blue-800" },
  aceptado: { label: "Aceptado", color: "bg-emerald-100 text-emerald-800" },
  aceptado_observacion: { label: "Aceptado con observación", color: "bg-yellow-100 text-yellow-800" },
  rechazado: { label: "Rechazado", color: "bg-red-100 text-red-800" },
  error: { label: "Error", color: "bg-rose-100 text-rose-800" },
};

export const CUSTOMER_DOC_TYPES = ["DNI", "RUC", "CE", "PASAPORTE", "OTRO"] as const;

export const ROLES = [
  { value: "administrador", label: "Administrador" },
  { value: "vendedor", label: "Vendedor" },
  { value: "contador", label: "Contador" },
  { value: "almacen", label: "Almacén" },
] as const;

/** Planes del SaaS (precios provisionales, validar con costos reales). */
export const PLANS = [
  {
    code: "free",
    name: "Free",
    price: 0,
    features: ["1 usuario", "Clientes", "Productos", "Ventas", "Funciones básicas", "Límite de comprobantes"],
  },
  {
    code: "emprendedor",
    name: "Emprendedor",
    price: 19.9,
    features: ["Más comprobantes", "Inventario", "Reportes", "Catálogo", "Más usuarios", "WhatsApp"],
  },
  {
    code: "negocio",
    name: "Negocio",
    price: 39.9,
    features: ["Usuarios", "Caja", "Compras", "Proveedores", "Reportes avanzados", "Inventario avanzado"],
  },
  {
    code: "pro",
    name: "Pro",
    price: 69.9,
    features: ["Multiempresa", "Multisucursal", "IA", "API", "Reportes avanzados", "Funciones premium"],
  },
] as const;