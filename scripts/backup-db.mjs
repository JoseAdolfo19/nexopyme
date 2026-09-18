// Respaldo de la base de datos MariaDB/MySQL y subida a Aiven Object Storage (S3-compatible).
// Cross-platform: se ejecuta con `node scripts/backup-db.mjs`.
//
// Requisitos:
//   - mysqldump disponible en el PATH (viene con XAMPP/MariaDB/MySQL).
//   - Credenciales de Aiven Object Storage en variables de entorno:
//       AIVEN_S3_ENDPOINT, AIVEN_S3_ACCESS_KEY, AIVEN_S3_SECRET_KEY, AIVEN_S3_BUCKET
//   - DATABASE_URL definida (o por CLI con --url / --host etc.).
//
// Uso:
//   node scripts/backup-db.mjs                    # usa env y borra el archivo temporal local
//   node scripts/backup-db.mjs --keep 14          # conservar últimas 14 copias en el bucket
//   node scripts/backup-db.mjs --keep-local       # además dejar una copia en ./backups
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, unlinkSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// ---- Argumentos ----
const args = process.argv.slice(2);
const argVal = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const KEEP = Number(argVal("--keep", process.env.AIVEN_S3_BACKUP_KEEP ?? "30"));
const KEEP_LOCAL = args.includes("--keep-local");
const OUT_DIR = resolve(argVal("--dir", "./backups"));

// ---- Parsear DATABASE_URL ----
const url = process.env.DATABASE_URL || "";
const m = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^/:]+)(?::(\d+))?\/([^?]+)/);
if (!m) {
  console.error("[backup] DATABASE_URL no es válida. Esperado: mysql://user:pass@host:port/db");
  process.exit(1);
}
const [, user, password, host, port = "3306", database] = m;

// ---- Credenciales Aiven Object Storage ----
const s3 = {
  endpoint: process.env.AIVEN_S3_ENDPOINT,
  accessKey: process.env.AIVEN_S3_ACCESS_KEY,
  secretKey: process.env.AIVEN_S3_SECRET_KEY,
  bucket: process.env.AIVEN_S3_BUCKET,
};
if (!s3.endpoint || !s3.accessKey || !s3.secretKey || !s3.bucket) {
  console.error(
    "[backup] Faltan credenciales de Aiven Object Storage. Define en el entorno:\n" +
      "  AIVEN_S3_ENDPOINT, AIVEN_S3_ACCESS_KEY, AIVEN_S3_SECRET_KEY, AIVEN_S3_BUCKET"
  );
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const key = `${database}_${stamp}.sql`;
const tempFile = join(OUT_DIR, key);
mkdirSync(OUT_DIR, { recursive: true });

console.log(`[backup] ${database}@${host}:${port} -> s3://${s3.bucket}/${key}`);

// ---- 1) Dump local temporal ----
const child = spawn(
  "mysqldump",
  ["--host", host, "--port", port, "--user", user, `--password=${password}`, "--single-transaction", "--routines", "--triggers", database],
  { stdio: ["ignore", "pipe", "inherit"] }
);

let out = "";
child.stdout.on("data", (d) => (out += d));
child.on("error", (err) => {
  console.error(`[backup] Error: ${err.message}`);
  console.error("[backup] Asegúrate de que mysqldump esté en el PATH.");
  process.exit(1);
});
child.on("close", async (code) => {
  if (code !== 0) {
    console.error(`[backup] mysqldump terminó con código ${code}.`);
    process.exit(1);
  }
  writeFileSync(tempFile, out, "utf8");
  const sizeKB = (out.length / 1024).toFixed(1);
  console.log(`[backup] Dump local OK (${sizeKB} KB)`);

  try {
    await upload(tempFile, key);
    await prune();
    console.log(`[backup] OK: s3://${s3.bucket}/${key}`);
  } catch (err) {
    console.error(`[backup] Error al subir a Aiven: ${err?.message ?? err}`);
    process.exit(1);
  } finally {
    if (!KEEP_LOCAL) {
      unlinkSync(tempFile);
    } else {
      console.log(`[backup] Copia local conservada: ${tempFile}`);
    }
  }
});

// ---- 2) Subida a Aiven Object Storage ----
const client = new S3Client({
  endpoint: s3.endpoint,
  region: process.env.AIVEN_S3_REGION ?? "us-east-1",
  credentials: { accessKeyId: s3.accessKey, secretAccessKey: s3.secretKey },
  forcePathStyle: true, // Aiven Object Storage usa estilo de ruta
});

async function upload(file, objectKey) {
  const body = readFileSync(file);
  await client.send(
    new PutObjectCommand({ Bucket: s3.bucket, Key: objectKey, Body: body })
  );
}

// ---- 3) Poda: conservar solo las KEEP copias más recientes del mismo prefijo ----
async function prune() {
  if (KEEP <= 0) return;
  const prefix = `${database}_`;
  const listed = await client.send(
    new ListObjectsV2Command({ Bucket: s3.bucket, Prefix: prefix })
  );
  const objects = (listed.Contents ?? [])
    .map((o) => o.Key)
    .filter((k) => k && k.endsWith(".sql"))
    .sort();
  const excess = objects.length - KEEP;
  if (excess > 0) {
    const toDelete = objects.slice(0, excess).map((Key) => ({ Key }));
    await client.send(
      new DeleteObjectsCommand({ Bucket: s3.bucket, Delete: { Objects: toDelete } })
    );
    toDelete.forEach((o) => console.log(`[backup] Eliminada copia antigua: ${o.Key}`));
  }
}