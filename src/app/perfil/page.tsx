import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import ProfileForm from "@/components/ProfileForm";
import { Card, CardHeader } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Mi perfil</h1>
        <p className="text-neutral-500">Actualiza tus datos de acceso y seguridad.</p>
      </div>
      <Card>
        <CardHeader title="Datos personales" subtitle={user.isSuperAdmin ? "Superadministrador global" : "Cuenta de usuario"} />
        <div className="p-5">
          <ProfileForm name={user.name} email={user.email} />
        </div>
      </Card>
    </AppShell>
  );
}