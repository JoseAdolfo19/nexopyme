import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifyEmailToken } from "@/lib/verification";

export const metadata: Metadata = { title: "Verificar correo" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  if (!token) {
    return <State kind="invalid" />;
  }

  const payload = await verifyEmailToken(token);
  if (!payload) {
    return <State kind="invalid" />;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return <State kind="invalid" />;
  }

  if (!user.emailVerified) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  }

  return <State kind="ok" />;
}

function State({ kind }: { kind: "ok" | "invalid" }) {
  const ok = kind === "ok";
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <span
          className={`mx-auto flex size-14 items-center justify-center rounded-2xl text-2xl font-bold text-white ${
            ok ? "bg-emerald-500" : "bg-rose-500"
          }`}
        >
          {ok ? "✓" : "!"}
        </span>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900">
          {ok ? "Correo verificado" : "Enlace no válido"}
        </h1>
        <p className="mt-2 text-neutral-600">
          {ok
            ? "Tu correo fue verificado correctamente. Ya puedes continuar."
            : "El enlace de verificación es inválido o ha expirado. Intenta volver a registrarte o usa un enlace más reciente."}
        </p>
        <Link
          href={ok ? "/dashboard" : "/login"}
          className="mt-6 inline-block w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-brand-700"
        >
          {ok ? "Ir a mi negocio" : "Ir a iniciar sesión"}
        </Link>
      </div>
    </div>
  );
}