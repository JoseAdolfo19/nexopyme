import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Verifica tu correo" };

type Props = { searchParams: Promise<{ email?: string; devUrl?: string }> };

/**
 * Pantalla de pendiente: se muestra tras registrarse. Como aún no hay
 * proveedor de correo, en desarrollo se muestra el enlace de verificación
 * (mailer log-based). En producción debe venir por email real.
 */
export default async function PendingPage({ searchParams }: Props) {
  const { email, devUrl } = await searchParams;
  const dev = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">
          ✉
        </span>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900">Verifica tu correo</h1>
        <p className="mt-2 text-neutral-600">
          Te enviamos un enlace de verificación{email ? ` a ${email}` : ""}.
          Haz clic en él para activar tu cuenta.
        </p>

        {dev && (
          <div className="mt-4 rounded-2xl bg-neutral-50 p-4 text-left">
            <p className="text-xs font-semibold text-neutral-500">
              MODO DESARROLLO — sin proveedor de correo configurado, usa este enlace:
            </p>
            {devUrl ? (
              <Link href={devUrl} className="text-sm text-brand-600 underline break-all">
                Verificar ahora (dev)
              </Link>
            ) : (
              <p className="text-sm text-neutral-500">
                (El enlace real se imprime en la consola del servidor con el prefijo [mailer:dev])
              </p>
            )}
          </div>
        )}

        <Link
          href="/login"
          className="mt-6 inline-block w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-center text-sm font-bold text-neutral-800 hover:bg-neutral-50"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    </div>
  );
}