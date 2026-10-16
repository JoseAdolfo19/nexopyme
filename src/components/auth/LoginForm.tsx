"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { FormAlert } from "@/components/ui/FormAlert";

export default function LoginForm() {
  const [state, action] = useActionState(loginAction, {});

  return (
    <>
      <form action={action} className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
        <Input label="Correo electrónico" name="email" type="email" placeholder="tucorreo@ejemplo.com" autoComplete="email" required />
        <Input label="Contraseña" name="password" type="password" placeholder="Tu contraseña" autoComplete="current-password" required />

        {state.error && <FormAlert type="error" title="No se pudo iniciar sesión" message={state.error} />}

        <SubmitButton fullWidth size="lg">
          Ingresar
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-600">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:underline">
          Crear cuenta gratis
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-neutral-600">
        ¿Olvidaste tu contraseña?{" "}
        <Link href="/recuperar-password" className="font-semibold text-brand-600 hover:underline">
          Recuperarla
        </Link>
      </p>
    </>
  );
}
