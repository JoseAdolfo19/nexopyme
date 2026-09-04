import "server-only";

import { prisma } from "@/lib/prisma";

type AuditEntry = {
  action: string;
  userId?: string | null;
  businessId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ip?: string | null;
};

/**
 * Registra un evento de auditoría en `audit_logs`.
 * La auditoría NUNCA debe romper la operación principal: cualquier error se
 * captura y se ignora (se puede monitorizar el fallo aparte).
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        userId: entry.userId ?? null,
        businessId: entry.businessId ?? null,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        oldValues: (entry.oldValues as object | null) ?? undefined,
        newValues: (entry.newValues as object | null) ?? undefined,
        ip: entry.ip ?? null,
      },
    });
  } catch {
    // No propagar: la operación principal debe continuar.
  }
}