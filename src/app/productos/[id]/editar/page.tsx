import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProductForm from "@/components/ProductForm";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Editar producto" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { business } = await requireBusiness();
  const { id } = await params;

  const product = await prisma.product.findFirst({
    where: { id, businessId: business.id },
  });
  if (!product) notFound();

  const categories = await prisma.category.findMany({
    where: { businessId: business.id, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <AppShell>
      <div className="mb-6">
        <Link href="/productos" className="text-sm font-semibold text-brand-600 hover:underline">
          ← Mis productos
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">Editar: {product.name}</h1>
      </div>
      <ProductForm
        categories={categories}
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          code: product.code,
          brand: product.brand,
          type: product.type,
          unit: product.unit,
          purchasePrice: product.purchasePrice.toString(),
          salePrice: product.salePrice.toString(),
          stock: product.stock.toString(),
          minStock: product.minStock.toString(),
          trackStock: product.trackStock,
        }}
      />
    </AppShell>
  );
}