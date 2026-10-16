"use client";

import { useActionState } from "react";
import { registerAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";

export default function RegisterForm() {
  const [state, action] = useActionState(registerAction, {});

  return (
    <form
      action={action}
      className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <Input label="Tu nombre" name="name" placeholder="Ej: Juan Pérez" autoComplete="name" required />
      <Input label="Correo electrónico" name="email" type="email" placeholder="tucorreo@ejemplo.com" autoComplete="email" required />
      <Input label="Contraseña" name="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" required />
      <Input label="Repite la contraseña" name="password_confirm" type="password" placeholder="Repite tu contraseña" autoComplete="new-password" required />

      {state.error && <FormAlert type="error" title="No se pudo crear la cuenta" message={state.error} />}

      <SubmitButton fullWidth size="lg">
        Crear mi cuenta
      </SubmitButton>
      <p className="text-center text-xs text-neutral-400">
        Al crear tu cuenta aceptas nuestros términos de uso y política de privacidad.
      </p>
    </form>
  );
}
