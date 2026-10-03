import Link from "next/link";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata = { title: "Nueva contraseña" };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">
            T
          </span>
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">Elige una nueva contraseña</h1>
          <p className="mt-1 text-neutral-500">El enlace es válido por 1 hora desde tu solicitud.</p>
        </div>

        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
            <p className="text-neutral-600">Este enlace no es válido o le falta el código de seguridad.</p>
            <Link
              href="/recuperar-password"
              className="mt-6 inline-block w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-brand-700"
            >
              Solicitar un nuevo enlace
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
