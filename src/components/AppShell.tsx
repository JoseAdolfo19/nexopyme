import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getSession } from "@/lib/auth";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { MODULE_MENU, businessTypeLabel } from "@/lib/constants";
import { cn } from "@/lib/cn";

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

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header superior */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
              N
            </span>
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
            <select
              name="business"
              defaultValue={businessId ?? ""}
              onChange={(e) => {
                if (e.target.value) window.location.href = `/switch-business?to=${e.target.value}`;
              }}
              className="hidden rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm sm:block"
            >
              {userBusinesses.map((ub) => (
                <option key={ub.business.id} value={ub.business.id}>
                  {ub.business.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-medium text-neutral-600 sm:block">{user.name}</span>
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
      <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-5">{children}</main>

      {/* Navegación inferior (mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-5xl items-stretch justify-around overflow-x-auto">
          {menuItems.slice(0, 6).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-[64px] flex-col items-center gap-0.5 px-2 py-2 text-neutral-500 hover:text-brand-600"
            >
              <span className="text-xl leading-none">{item.emoji}</span>
              <span className="text-[11px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}