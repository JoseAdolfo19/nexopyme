import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD;
const name = process.env.SUPERADMIN_NAME?.trim() || "Superadministrador";

if (!email || !password || password.length < 8) {
  throw new Error("Define SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD (mínimo 8 caracteres)." );
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

try {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, isActive: true, isSuperAdmin: true, emailVerified: new Date() },
    create: { email, name, passwordHash, isActive: true, isSuperAdmin: true, emailVerified: new Date() },
    select: { email: true },
  });
  console.log(`Superadministrador listo: ${user.email}`);
} finally {
  await prisma.$disconnect();
  await pool.end();
}
