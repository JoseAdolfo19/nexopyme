import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loginFormAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white">
            N
          </span>
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">Bienvenido de vuelta</h1>
          <p className="mt-1 text-neutral-500">Ingresa a tu negocio</p>
        </div>

        <form
          action={loginFormAction}
          className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <Input label="Correo electrónico" name="email" type="email" placeholder="tucorreo@ejemplo.com" autoComplete="email" required />
          <Input label="Contraseña" name="password" type="password" placeholder="Tu contraseña" autoComplete="current-password" required />
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
      </div>
    </div>
  );
}