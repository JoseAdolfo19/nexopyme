// Cliente Prisma compartido para scripts (seed, usuarios de prueba, etc.).
// Usa PostgreSQL vía @prisma/adapter-pg, en línea con src/lib/prisma.ts.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

/** Crea un PrismaClient conectado por DATABASE_URL (PostgreSQL). */
export function createDb(): PrismaClient {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}
