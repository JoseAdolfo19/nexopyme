
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

async function createAdmin() {
  console.log("🛠️ Creating Admin User...");

  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const password = "Admin123456";
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: "Administrador Tienda Plus",
        email: "admin@tiendaplus.test",
        passwordHash: passwordHash,
        emailVerified: new Date(), // Marcamos como verificado para saltar la pantalla de verificación
        isActive: true,
      },
    });
    console.log("✅ User created:", user.email);

    const business = await prisma.business.create({
      data: {
        ownerId: user.id,
        name: "Empresa Principal",
        slug: "empresa-principal",
        businessType: "tienda",
        status: "activo",
      },
    });
    console.log("✅ Business created:", business.name);

    await prisma.businessUser.create({
      data: {
        businessId: business.id,
        userId: user.id,
        role: "administrador",
        isActive: true,
      },
    });
    console.log("✅ Business membership created.");

    console.log("\n🎉 ADMIN ACCOUNT READY!");
    console.log("----------------------------------");
    console.log("Email: admin@tiendaplus.test");
    console.log("Password: Admin123456");
    console.log("----------------------------------");

  } catch (error) {
    console.error("❌ ERROR creating admin:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

createAdmin();
