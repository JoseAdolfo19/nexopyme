import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { Input, Select, Textarea, Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { CUSTOMER_DOC_TYPES } from "@/lib/constants";
import { createCustomerFormAction } from "@/app/actions/customers";
import AppShell from "@/components/AppShell";

export const metadata = { title: "Nuevo cliente" };

export default async function NewCustomerPage() {
  await requireBusiness();

  return (
    <AppShell>
      <div className="mb-6">
        <Link href="/clientes" className="text-sm font-semibold text-brand-600 hover:underline">
          ← Mis clientes
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">Nuevo cliente</h1>
      </div>

      <form action={createCustomerFormAction} className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Tipo de documento">
            <Select name="doc_type" defaultValue="DNI">
              {CUSTOMER_DOC_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Número de documento">
            <Input name="doc_number" placeholder="Ej: 71234567" />
          </Field>
        </div>

        <Input label="Nombre completo *" name="name" placeholder="Ej: María Quispe" required />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Correo" name="email" type="email" placeholder="cliente@ejemplo.com" />
          <Input label="Teléfono" name="phone" placeholder="Ej: 984 123 456" />
        </div>
        <Input label="Dirección" name="address" placeholder="Ej: Jr. Los Andes 45" />
        <Input label="Ciudad" name="city" placeholder="Urubamba" />
        <Textarea label="Notas" name="notes" placeholder="Opcional: preferencias, observaciones..." />

        <div className="pt-2">
          <SubmitButton fullWidth size="lg">Guardar cliente</SubmitButton>
        </div>
      </form>
    </AppShell>
  );
}