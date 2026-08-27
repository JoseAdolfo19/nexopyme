import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registerFormAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">
            N
          </span>
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">Crea tu cuenta gratis</h1>
          <p className="mt-1 text-neutral-500">Empieza a organizar tu negocio en minutos</p>
        </div>

        <form
          action={registerFormAction}
          className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <Input label="Tu nombre" name="name" placeholder="Ej: Juan Pérez" autoComplete="name" required />
          <Input label="Correo electrónico" name="email" type="email" placeholder="tucorreo@ejemplo.com" autoComplete="email" required />
          <Input label="Contraseña" name="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" required />
          <Input label="Repite la contraseña" name="password_confirm" type="password" placeholder="Repite tu contraseña" autoComplete="new-password" required />
          <SubmitButton fullWidth size="lg">
            Crear mi cuenta
          </SubmitButton>
          <p className="text-center text-xs text-neutral-400">
            Al crear tu cuenta aceptas nuestros términos de uso y política de privacidad.
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}