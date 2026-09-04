import { NextResponse } from "next/server";
import { lookupDocument, LookupError } from "@/lib/lookups/chequea";

/**
 * GET /api/sunat/lookup?docNumber=12345678
 *
 * Devuelve los datos del documento (DNI o RUC) consultando Chequea Perú.
 * Requiere sesión iniciada (cualquier usuario autenticado).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const docNumber = (searchParams.get("docNumber") ?? "").trim();

  if (!docNumber) {
    return NextResponse.json({ error: "Falta el parámetro docNumber." }, { status: 400 });
  }

  try {
    const data = await lookupDocument(docNumber);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof LookupError) {
      const status =
        err.code === "AUTH" ? 502 : err.code === "NOT_FOUND" ? 404 : err.code === "BAD_INPUT" ? 400 : 502;
      return NextResponse.json({ ok: false, error: err.message, code: err.code }, { status });
    }
    return NextResponse.json(
      { ok: false, error: "No se pudo completar la consulta." },
      { status: 500 },
    );
  }
}
