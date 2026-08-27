import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SaleForm from "@/components/SaleForm";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Nueva venta" };

export default async function NewSalePage() {
  const { business } = await requireBusiness();

  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: { businessId: business.id, isActive: true },
      select: {
        id: true,
        name: true,
        salePrice: true,
        stock: true,
        type: true,
        unit: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { businessId: business.id, isActive: true },
      select: { id: true, name: true, docNumber: true, docType: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <AppShell>
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm font-semibold text-brand-600 hover:underline">
          ← Inicio
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">Nueva venta</h1>
        <p className="text-neutral-500">Busca un producto, agrega la cantidad y registra.</p>
      </div>

      <SaleForm
        products={products.map((p) => ({
          ...p,
          salePrice: Number(p.salePrice),
          stock: Number(p.stock),
        }))}
        customers={customers}
      />
    </AppShell>
  );
}