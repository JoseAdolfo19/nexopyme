"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/profile";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";

export default function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState(updateProfileAction, {});

  return (
    <form action={action} className="space-y-4">
      <Input label="Nombre completo" name="name" defaultValue={name} required />
      <Input label="Correo electrónico" name="email" defaultValue={email} disabled />
      <div className="border-t border-neutral-100 pt-4">
        <h2 className="font-bold text-neutral-900">Cambiar contraseña</h2>
        <p className="mt-1 text-sm text-neutral-500">Déjalos vacíos si no deseas cambiarla.</p>
      </div>
      <Input label="Contraseña actual" name="current_password" type="password" autoComplete="current-password" />
      <Input label="Nueva contraseña" name="new_password" type="password" autoComplete="new-password" minLength={8} />
      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Perfil actualizado.</p>}
      <SubmitButton>Guardar perfil</SubmitButton>
    </form>
  );
}
