"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, {});

  if (state.ok) {
    return (
      <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500 text-2xl font-bold text-white">
          ✓
        </span>
        <h2 className="mt-4 text-xl font-bold text-neutral-900">Contraseña actualizada</h2>
        <p className="mt-2 text-neutral-600">Ya puedes iniciar sesión con tu nueva contraseña.</p>
        <Link
          href="/login"
          className="mt-6 inline-block w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-700"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form
      action={action}
      className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="token" value={token} />
      <Input label="Nueva contraseña" name="new_password" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" required minLength={8} />
      <Input label="Repite la nueva contraseña" name="password_confirm" type="password" placeholder="Repite tu contraseña" autoComplete="new-password" required minLength={8} />

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>
      )}

      <SubmitButton fullWidth size="lg">
        Guardar nueva contraseña
      </SubmitButton>
    </form>
  );
}
