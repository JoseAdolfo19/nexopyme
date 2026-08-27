import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProductForm from "@/components/ProductForm";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const { business } = await requireBusiness();
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
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">Nuevo producto</h1>
      </div>
      <ProductForm categories={categories} />
    </AppShell>
  );
}