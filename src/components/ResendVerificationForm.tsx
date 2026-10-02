"use client";

import { useActionState } from "react";
import { resendVerificationAction } from "@/app/actions/auth";

export default function ResendVerificationForm() {
  const [state, action, pending] = useActionState(resendVerificationAction, {});

  return (
    <form action={action} className="mt-3">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Reenviar correo de verificación"}
      </button>
      {state.error && <p role="alert" className="mt-2 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="mt-2 text-sm text-emerald-700">Correo enviado. Revisa también la carpeta de spam.</p>}
    </form>
  );
}