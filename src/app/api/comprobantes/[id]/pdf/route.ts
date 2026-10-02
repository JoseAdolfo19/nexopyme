import { requireBusiness } from "@/lib/auth";
import { createDocumentPdf } from "@/lib/documentPdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { business } = await requireBusiness();
  const { id } = await params;
  const pdf = await createDocumentPdf(business, id);
  if (!pdf) return new Response("Comprobante no encontrado", { status: 404 });

  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}