import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image src="/logo_icono.png" alt="Tienda Plus" width={72} height={72} className="mx-auto size-16 rounded-2xl" />
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">Crea tu cuenta gratis</h1>
          <p className="mt-1 text-neutral-500">Empieza a organizar tu negocio en minutos</p>
        </div>

        <RegisterForm />

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