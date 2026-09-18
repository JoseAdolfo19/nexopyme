
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

async function testDb() {
  console.log("🚀 Starting E2E Database Test (with PostgreSQL Adapter)...");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("❌ DATABASE_URL is not defined in .env");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Create a Random User
    const password = "testpassword123";
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name: "Test User " + Math.floor(Math.random() * 1000),
        email: `test_${Date.now()}@example.com`,
        passwordHash: passwordHash,
      },
    });
    console.log("✅ User created:", user.email);

    // 2. Create a Random Business
    const business = await prisma.business.create({
      data: {
        ownerId: user.id,
        name: "Test Business " + Math.floor(Math.random() * 1000),
        slug: `test-biz-${Date.now()}`,
        businessType: "tienda",
      },
    });
    console.log("✅ Business created:", business.name);

    // 3. Create a Random Product
    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        name: "Test Product " + Math.floor(Math.random() * 1000),
        salePrice: 10.50,
        stock: 100,
      },
    });
    console.log("✅ Product created:", product.name);

    // 4. Verify Data is actually there
    const fetchedUser = await prisma.user.findUnique({
      where: { email: user.email },
    });

    if (fetchedUser) {
      console.log("🎉 SUCCESS: Data verified in Supabase!");
    } else {
      throw new Error("Could not find the created user in the database.");
    }

  } catch (error) {
    console.error("❌ DATABASE TEST FAILED:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testDb();
