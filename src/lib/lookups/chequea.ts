/**
 * Cliente para consulta de DNI y RUC contra Chequea Perú.
 *
 * Documentación del proveedor:
 * - Base URL: https://api.chequeaperu.com
 * - DNI:   GET /api/dni/{dni}
 * - RUC:   GET /api/ruc/{ruc}
 * - Auth:  Authorization: Bearer <token>
 *
 * Plan free: 25,000 consultas de RUC/DNI/Tipo de Cambio al mes.
 *
 * Variables de entorno:
 * - CHEQUEA_TOKEN (obligatoria)
 * - CHEQUEA_BASE_URL (opcional, default: https://api.chequeaperu.com)
 */

const DEFAULT_BASE_URL = "https://api.chequeaperu.com";

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
  const token = process.env.CHEQUEA_TOKEN;
  const baseUrl = process.env.CHEQUEA_BASE_URL ?? DEFAULT_BASE_URL;
  if (!token) {
    throw new LookupError(
      "Falta configurar CHEQUEA_TOKEN en .env. Obtén tu token en https://chequeaperu.com",
      "CONFIG_MISSING",
    );
  }
  return { token, baseUrl };
}

async function request<T>(path: string): Promise<T> {
  const { token, baseUrl } = getConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    // Evita caché agresivo del cliente HTTP
    cache: "no-store",
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

  const data = (await res.json()) as T;
  return data;
}

/**
 * Normaliza la respuesta del proveedor a la estructura DniResult.
 * Si los campos exactos no coinciden, ajusta aquí sin tocar el resto.
 */
function normalizeDni(dni: string, raw: Record<string, unknown>): DniResult {
  const nombres = String(raw.nombres ?? raw.nombre ?? "").trim();
  const apellidoPaterno = String(raw.apellidoPaterno ?? raw.apellido_paterno ?? raw.ape_paterno ?? "").trim();
  const apellidoMaterno = String(raw.apellidoMaterno ?? raw.apellido_materno ?? raw.ape_materno ?? "").trim();
  return {
    dni,
    nombres,
    apellidoPaterno,
    apellidoMaterno,
    nombreCompleto: `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.replace(/\s+/g, " ").trim(),
    direccion: (raw.direccion as string | undefined) ?? null,
    ubigeo: (raw.ubigeo as string | undefined) ?? null,
  };
}

function normalizeRuc(ruc: string, raw: Record<string, unknown>): RucResult {
  return {
    ruc,
    razonSocial: String(raw.razonSocial ?? raw.razon_social ?? "").trim(),
    nombreComercial: (raw.nombreComercial as string | undefined) ?? (raw.nombre_comercial as string | undefined) ?? null,
    direccion: (raw.direccion as string | undefined) ?? null,
    estado: (raw.estado as string | undefined) ?? null,
    condicion: (raw.condicion as string | undefined) ?? null,
    ubigeo: (raw.ubigeo as string | undefined) ?? null,
    departamento: (raw.departamento as string | undefined) ?? null,
    provincia: (raw.provincia as string | undefined) ?? null,
    distrito: (raw.distrito as string | undefined) ?? null,
  };
}

export function lookupDni(dni: string): Promise<DniResult> {
  if (!/^\d{8}$/.test(dni)) {
    return Promise.reject(new LookupError("El DNI debe tener exactamente 8 dígitos.", "BAD_INPUT"));
  }
  return request<Record<string, unknown>>(`/api/dni/${dni}`).then((raw) => normalizeDni(dni, raw));
}

export function lookupRuc(ruc: string): Promise<RucResult> {
  if (!/^\d{11}$/.test(ruc)) {
    return Promise.reject(new LookupError("El RUC debe tener exactamente 11 dígitos.", "BAD_INPUT"));
  }
  return request<Record<string, unknown>>(`/api/ruc/${ruc}`).then((raw) => normalizeRuc(ruc, raw));
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
