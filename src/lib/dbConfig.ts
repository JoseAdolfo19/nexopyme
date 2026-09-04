import type { PoolConfig } from "mariadb";

/**
 * Construye la config de conexión a la base de datos (MariaDB/MySQL).
 *
 * - Sin SSL: devuelve la URL tal cual (entorno local / XAMPP).
 * - Con SSL (Aiven y otros): si la URL trae `ssl-mode=REQUIRED` o existe
 *   `DATABASE_SSL_CA`, arma una PoolConfig con `ssl`. Si se provee el CA
 *   (contenido PEM en `DATABASE_SSL_CA`) valida la identidad del servidor;
 *   si no, conecta cifrado sin validar el CA.
 * - Se suben los timeouts porque el handshake TLS remoto suele ser lento.
 */
export function buildConnectionConfig(): string | PoolConfig {
  const url = process.env.DATABASE_URL ?? "mysql://root:@127.0.0.1:3306/bizcaja";
  const ca = process.env.DATABASE_SSL_CA;

  const needsSsl = !!ca || /ssl-mode=REQUIRED/i.test(url);
  if (!needsSsl) return url;

  const m = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^/:]+):(\d+)\/([^?]+)/);
  if (!m) return url;

  const [, user, password, host, port, database] = m;
  const ssl = ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false };

  return {
    host,
    port: Number(port),
    user,
    password,
    database,
    ssl,
    connectionLimit: 5,
    connectTimeout: 20000,
    acquireTimeout: 20000,
  };
}