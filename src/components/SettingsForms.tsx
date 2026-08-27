"use client";

import { useActionState } from "react";
import { saveSunatConfigAction, saveBusinessProfileAction } from "@/app/actions/settings";
import { Input, Select, Field } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";

export function BusinessProfileForm({
  business,
}: {
  business: {
    name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    description: string | null;
  };
}) {
  const [state, action] = useActionState(saveBusinessProfileAction, {});

  return (
    <form action={action} className="space-y-4">
      <Input label="Nombre del negocio *" name="name" defaultValue={business.name} required />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Teléfono / WhatsApp" name="phone" defaultValue={business.phone ?? ""} />
        <Field label="Ciudad">
          <Select name="city" defaultValue={business.city ?? "Urubamba"}>
            <option>Urubamba</option>
            <option>Ollantaytambo</option>
            <option>Cusco</option>
            <option>Otra</option>
          </Select>
        </Field>
      </div>
      <Input label="Dirección" name="address" defaultValue={business.address ?? ""} />
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Descripción del negocio</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={business.description ?? ""}
          placeholder="¿Qué vendes? Aparecerá en tu catálogo público."
          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Guardado ✓</p>}
      <SubmitButton>Guardar cambios</SubmitButton>
    </form>
  );
}

export function SunatConfigForm({
  business,
}: {
  business: {
    ruc: string | null;
    razonSocial: string | null;
    settings: {
      sunat?: {
        sunatUser?: string;
        seriesBoleta?: string;
        seriesFactura?: string;
        environment?: string;
      };
    } | null;
  };
}) {
  const [state, action] = useActionState(saveSunatConfigAction, {});
  const sunat = business.settings?.sunat ?? {};

  return (
    <form action={action} className="space-y-4">
      <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
        ⚠️ <strong>Ambiente BETA:</strong> mientras no se active la integración oficial, los
        comprobantes se generan y quedan listos para el envío real a SUNAT. Nunca uses
        producción con datos de prueba.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="RUC (11 dígitos)" name="ruc" defaultValue={business.ruc ?? ""} maxLength={11} placeholder="Ej: 20601234567" />
        <Input label="Razón social" name="razon_social" defaultValue={business.razonSocial ?? ""} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Usuario SOL (SUNAT)" name="sunat_user" defaultValue={sunat.sunatUser ?? ""} autoComplete="off" />
        <Input label="Clave SOL" name="sunat_password" type="password" autoComplete="new-password" placeholder="••••••••" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input label="Serie de boleta" name="series_boleta" defaultValue={sunat.seriesBoleta ?? "B001"} placeholder="B001" />
        <Input label="Serie de factura" name="series_factura" defaultValue={sunat.seriesFactura ?? "F001"} placeholder="F001" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Ambiente">
          <Select name="environment" defaultValue={sunat.environment ?? "beta"}>
            <option value="beta">BETA (pruebas)</option>
            <option value="produccion">PRODUCCIÓN</option>
          </Select>
        </Field>
        <Input label="Contraseña del certificado digital" name="certificate_password" type="password" autoComplete="new-password" placeholder="••••••••" />
      </div>

      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Guardado ✓</p>}

      <SubmitButton>Guardar configuración SUNAT</SubmitButton>
    </form>
  );
}