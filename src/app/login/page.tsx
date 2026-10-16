import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Ingresar" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image src="/logo_icono.png" alt="Tienda Plus" width={72} height={72} className="mx-auto size-16 rounded-2xl" />
          <h1 className="mt-4 text-2xl font-bold text-neutral-900">Bienvenido de vuelta</h1>
          <p className="mt-1 text-neutral-500">Ingresa a tu negocio</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}