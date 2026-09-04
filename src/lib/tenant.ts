import "server-only";

import { Prisma } from "@/generated/prisma/client";

/**
 * Aislamiento multi-tenant automático.
 *
 * En lugar de depender de que cada query filtre `businessId` "a mano",
 * esta extensión lo inyecta de forma centralizada en los modelos que tienen
 * una columna `businessId`, cuando la query aún no lo incluye.
 *
 * Modelos con columna `businessId` directa:
 */
const TENANT_MODELS = new Set([
  "Branch",
  "Customer",
  "Supplier",
  "Category",
  "Product",
  "InventoryMovement",
  "Sale",
  "Payment",
  "Document",
  "SunatSubmission",
  "SunatResponse",
  "CashRegister",
  "CashMovement",
  "Subscription",
  "AuditLog",
]);

/**
 * Modelos que NO tienen columna `businessId` propia y por tanto no se
 * auto-aislan por esta extensión. Su aislamiento debe garantizarse de otra
 * forma (owner/membresía para `User`/`Business`/`BusinessUser`, o por
 * relación para `SaleItem` que cuelga de `Sale`).
 */
const NOT_TENANT_MODELS = new Set(["User", "Business", "BusinessUser", "SaleItem", "Plan"]);

function isTenantModel(model: string): boolean {
  return TENANT_MODELS.has(model);
}

function hasOwnWhere(model: string): boolean {
  return TENANT_MODELS.has(model);
}

/**
 * Devuelve el `where` con `businessId` garantizado.
 * Si ya existe `businessId` en la raíz, no lo duplica (respeta filtros
 * explícitos). Si el where es un array de OR/operadores, lo envuelve con AND.
 * Usado en operaciones de lectura y en updateMany/deleteMany (aceptan `AND`).
 */
function scopeWhere(model: string, where: any, businessId: string): any {
  if (!where) return { businessId };
  if (where.businessId !== undefined) return where;
  return { AND: [where, { businessId }] };
}

/**
 * Versión para `update`/`delete`/`upsert`, cuyo `where` DEBE ser único
 * (no admite `AND`). En lugar de envolver en AND, fusiona `businessId` a nivel
 * raíz junto al campo único (p. ej. `{ id, businessId }`), que Prisma acepta
 * en where único. Esto preserva la unicidad y añade el aislamiento por tenant.
 */
function scopeUniqueWhere(model: string, where: any, businessId: string): any {
  if (!where) return { businessId };
  if (where.businessId !== undefined) return where;
  return { ...where, businessId };
}

/**
 * Crea una extensión de Prisma que aísla las consultas por `businessId`.
 * Uso: `prisma.$extends(scopedPrisma(businessId))` o vía el helper `scope()`.
 */
export function scopedPrisma(businessId: string) {
  return Prisma.defineExtension({
    name: `tenant-scope-${businessId}`,
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          args.where = scopeWhere(model, args.where, businessId);
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          args.where = scopeWhere(model, args.where, businessId);
          return query(args);
        },
        async findFirstOrThrow({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          args.where = scopeWhere(model, args.where, businessId);
          return query(args);
        },
        async count({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          args.where = scopeWhere(model, args.where, businessId);
          return query(args);
        },
        async aggregate({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          if (args.where) args.where = scopeWhere(model, args.where, businessId);
          else args.where = { businessId };
          return query(args);
        },
        async groupBy({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          if (args.where) args.where = scopeWhere(model, args.where, businessId);
          else args.where = { businessId };
          return query(args);
        },
        async create({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          const data = args.data as Record<string, unknown>;
          if (data.businessId === undefined) {
            data.businessId = businessId;
          }
          return query(args);
        },
        async createMany({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          const raw = args.data as Record<string, unknown> | Record<string, unknown>[];
          const items = Array.isArray(raw) ? raw : [raw];
          for (const item of items) {
            if (item && item.businessId === undefined) item.businessId = businessId;
          }
          return query(args);
        },
        async update({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          args.where = scopeUniqueWhere(model, args.where, businessId);
          return query(args);
        },
        async updateMany({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          args.where = scopeWhere(model, args.where, businessId);
          return query(args);
        },
        async delete({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          args.where = scopeUniqueWhere(model, args.where, businessId);
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          args.where = scopeWhere(model, args.where, businessId);
          return query(args);
        },
        async upsert({ model, args, query }) {
          if (!isTenantModel(model)) return query(args);
          args.where = scopeUniqueWhere(model, args.where, businessId);
          if (args.create && (args.create as Record<string, unknown>).businessId === undefined) {
            (args.create as Record<string, unknown>).businessId = businessId;
          }
          return query(args);
        },
      },
    },
  });
}

/** Guardia en tiempo de desarrollo para detectar queries sin scope. */
export function assertScoped(model: string, businessId: string | undefined): void {
  if (process.env.NODE_ENV === "production") return;
  if (!businessId) return;
  if (NOT_TENANT_MODELS.has(model)) return;
  if (hasOwnWhere(model) && !businessId) {
    throw new Error(`[tenant] Query al modelo ${model} sin businessId de contexto.`);
  }
}

/** True si el modelo debe quedar aislado por businessId. */
export function isTenantScoped(model: string): boolean {
  return isTenantModel(model);
}