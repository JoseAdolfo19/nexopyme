// Aplica las migraciones de Prisma a la BD de producción durante el build de Vercel.
// - Si existe DATABASE_SSL_CA (BD en nube tipo Aiven), escribe el certificado a un
//   archivo temporal y añade parámetros SSL a la URL para que `prisma migrate deploy`
//   conecte de forma segura.
// - Después de migrar, siembra los planes (upsert idempotente).
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

let url = process.env.DATABASE_URL || "";
const ca = process.env.DATABASE_SSL_CA;

if (ca && !/ssl-mode/i.test(url)) {
  const caPath = join(process.cwd(), ".vercel-ca.pem");
  writeFileSync(caPath, ca, "utf8");
  const [base, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("ssl-mode", "VERIFY_CA");
  params.set("ssl-ca", caPath);
  url = `${base}?${params.toString()}`;
  process.env.DATABASE_URL = url;
  console.log("[migrate-deploy] URL de BD preparada con SSL (CA desde DATABASE_SSL_CA).");
}

execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
execSync("npx prisma db seed", { stdio: "inherit", env: process.env });