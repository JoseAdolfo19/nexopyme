import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdjustStockForm from "@/components/AdjustStockForm";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Ajustar stock" };

export default async function AdjustStockPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business } = await requireBusiness();
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, businessId: business.id, trackStock: true },
  });
  if (!product) notFound();

  return (
    <AppShell>
      <div className="mb-6">
        <Link href="/inventario" className="text-sm font-semibold text-brand-600 hover:underline">
          ← Inventario
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">Ajustar stock</h1>
      </div>
      <AdjustStockForm
        productId={product.id}
        productName={product.name}
        currentStock={Number(product.stock)}
        unit={product.unit}
      />
    </AppShell>
  );
}