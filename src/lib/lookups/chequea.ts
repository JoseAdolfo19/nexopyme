/** Cliente backend para consultas de DNI y RUC contra API Perú. */

const DEFAULT_BASE_URL = "https://api.apiperu.pe";

export type DniResult = {
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  /** Opcionales según respuesta del proveedor. */
  direccion?: string | null;
  ubigeo?: string | null;
};

export type RucResult = {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string | null;
  direccion?: string | null;
  estado?: string | null;
  condicion?: string | null;
  ubigeo?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
};

export class LookupError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "LookupError";
  }
}

function getConfig() {
  const token = process.env.APIPERU_TOKEN;
  const baseUrl = process.env.APIPERU_BASE_URL ?? DEFAULT_BASE_URL;
  if (!token) {
    throw new LookupError(
      "Falta configurar APIPERU_TOKEN en las variables de entorno.",
      "CONFIG_MISSING",
    );
  }
  return { token, baseUrl };
}

async function request<T>(path: string, body: Record<string, string>): Promise<T> {
  const { token, baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new LookupError("Token de Chequea Perú inválido o sin saldo.", "AUTH");
    }
    if (res.status === 404) {
      throw new LookupError("Documento no encontrado.", "NOT_FOUND");
    }
    if (res.status === 429) {
      throw new LookupError("Demasiadas consultas. Intenta en unos minutos.", "RATE_LIMIT");
    }
    throw new LookupError(`Error en la consulta (${res.status}).`, "UPSTREAM");
  }

  const data = (await res.json()) as T & { success?: boolean; message?: string };
  if (data.success === false) {
    throw new LookupError(data.message ?? "API Perú no encontró el documento.", "NOT_FOUND");
  }
  return data;
}

/**
 * Normaliza la respuesta del proveedor a la estructura DniResult.
 * Si los campos exactos no coinciden, ajusta aquí sin tocar el resto.
 */
function unwrap(raw: Record<string, unknown>): Record<string, unknown> {
  return raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
    ? raw.data as Record<string, unknown>
    : raw;
}

function normalizeDni(dni: string, raw: Record<string, unknown>): DniResult {
  const data = unwrap(raw);
  const nombres = String(data.nombres ?? data.nombre ?? "").trim();
  const apellidoPaterno = String(data.apellido_paterno ?? data.apellidoPaterno ?? data.ape_paterno ?? "").trim();
  const apellidoMaterno = String(data.apellido_materno ?? data.apellidoMaterno ?? data.ape_materno ?? "").trim();
  return {
    dni,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    nombreCompleto: String(data.nombre_completo ?? `${nombres} ${apellidoPaterno} ${apellidoMaterno}`).replace(/\s+/g, " ").trim(),
    direccion: (data.direccion as string | undefined) ?? null,
    ubigeo: Array.isArray(data.ubigeo) ? null : (data.ubigeo as string | undefined) ?? null,
  };
}

function normalizeRuc(ruc: string, raw: Record<string, unknown>): RucResult {
  const data = unwrap(raw);
  return {
    ruc,
    razonSocial: String(data.razon_social ?? data.razonSocial ?? "").trim(),
    nombreComercial: (data.nombre_comercial as string | undefined) ?? (data.nombreComercial as string | undefined) ?? null,
    direccion: (data.direccion as string | undefined) ?? null,
    estado: (data.estado as string | undefined) ?? null,
    condicion: (data.condicion as string | undefined) ?? null,
    ubigeo: Array.isArray(data.ubigeo) ? null : (data.ubigeo as string | undefined) ?? null,
    departamento: (data.departamento as string | undefined) ?? null,
    provincia: (data.provincia as string | undefined) ?? null,
    distrito: (data.distrito as string | undefined) ?? null,
  };
}

export function lookupDni(dni: string): Promise<DniResult> {
  if (!/^\d{8}$/.test(dni)) {
    return Promise.reject(new LookupError("El DNI debe tener exactamente 8 dígitos.", "BAD_INPUT"));
  }
  return request<Record<string, unknown>>("/dni", { dni }).then((raw) => normalizeDni(dni, raw));
}

export function lookupRuc(ruc: string): Promise<RucResult> {
  if (!/^\d{11}$/.test(ruc)) {
    return Promise.reject(new LookupError("El RUC debe tener exactamente 11 dígitos.", "BAD_INPUT"));
  }
  return request<Record<string, unknown>>("/ruc", { ruc }).then((raw) => normalizeRuc(ruc, raw));
}

/**
 * Auto-dispatch según longitud del documento.
 * - 8 dígitos  -> DNI
 * - 11 dígitos -> RUC
 */
export function lookupDocument(docNumber: string): Promise<DniResult | RucResult> {
  const clean = docNumber.replace(/\D/g, "");
  if (clean.length === 8) return lookupDni(clean);
  if (clean.length === 11) return lookupRuc(clean);
  return Promise.reject(
    new LookupError("Solo se admiten DNI (8 dígitos) o RUC (11 dígitos).", "BAD_INPUT"),
  );
}
