"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordResetAction, {});

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">
            T
          </span>
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">Recupera tu contraseña</h1>
          <p className="mt-1 text-neutral-500">
            Escribe tu correo y te enviaremos un enlace para elegir una nueva contraseña.
          </p>
        </div>

        <form
          action={action}
          className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <Input label="Correo electrónico" name="email" type="email" placeholder="tucorreo@ejemplo.com" autoComplete="email" required />

          {state.error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>
          )}

          {state.ok && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              Si el correo tiene una cuenta, te enviamos un enlace de recuperación. Revisa tu bandeja
              de entrada y la carpeta de spam.
            </p>
          )}

          {state.devUrl && (
            <div className="rounded-2xl bg-neutral-50 p-4 text-left">
              <p className="text-xs font-semibold text-neutral-500">
                MODO DESARROLLO — sin correo configurado, usa este enlace:
              </p>
              <Link href={state.devUrl} className="text-sm text-brand-600 underline break-all">
                Restablecer ahora (dev)
              </Link>
            </div>
          )}

          <SubmitButton fullWidth size="lg">
            Enviar enlace de recuperación
          </SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          ¿Recordaste tu contraseña?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
