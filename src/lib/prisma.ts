import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { scopedPrisma } from "@/lib/tenant";
import { buildConnectionConfig } from "@/lib/dbConfig";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaMariaDb(buildConnectionConfig());
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function scope(businessId: string) {
  return prisma.$extends(scopedPrisma(businessId));
}