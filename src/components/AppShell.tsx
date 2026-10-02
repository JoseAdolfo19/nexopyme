import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser, getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { MODULE_MENU, businessTypeLabel } from "@/lib/constants";
import BusinessSwitcher from "@/components/BusinessSwitcher";
import SidebarNav from "@/components/SidebarNav";

export default async function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const session = await getSession();
  if (!user) redirect("/login");

  const businessId = session?.businessId;

  let business = null;
  let modules: string[] = [];
  if (businessId) {
    business = await prisma.business.findFirst({
      where: { id: businessId, users: { some: { userId: user.id, isActive: true } } },
      select: { id: true, name: true, businessType: true, modules: true, status: true },
    });
    modules = (business?.modules as string[]) ?? [];
  }

  // Si el usuario tiene negocios pero no hay uno activo, mostrar selector.
  const userBusinesses = await prisma.businessUser.findMany({
    where: { userId: user.id, isActive: true },
    include: { business: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const menuItems = modules
    .map((m) => MODULE_MENU[m])
    .filter(Boolean)
    .concat([MODULE_MENU.configuracion]);
  if (user.isSuperAdmin) menuItems.push(MODULE_MENU.superadmin);

  return (
    <div className="min-h-screen bg-neutral-50">
      <SidebarNav items={menuItems} />

      {/* Header superior */}
      <header className="app-header sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 pl-16 lg:pl-64">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image src="/logo_icono.png" alt="Tienda Plus" width={36} height={36} className="size-9 rounded-xl" />
            {business && (
              <span className="leading-tight">
                <span className="block font-bold text-neutral-900">{business.name}</span>
                <span className="block text-xs text-neutral-500">
                  {businessTypeLabel(business.businessType)}
                </span>
              </span>
            )}
          </Link>

          {userBusinesses.length > 1 && (
            <BusinessSwitcher
              businesses={userBusinesses.map((ub) => ({
                id: ub.business.id,
                name: ub.business.name,
              }))}
              currentId={businessId ?? ""}
            />
          )}

          <div className="flex items-center gap-2">
            <Link href="/perfil" className="hidden text-sm font-medium text-neutral-600 hover:text-brand-600 sm:block">{user.name}</Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-5 lg:pl-64">{children}</main>
    </div>
  );
}