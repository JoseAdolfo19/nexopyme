"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { createBusinessAction } from "@/app/actions/business";
import { BUSINESS_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { Input, Select, Field } from "@/components/ui/Field";
import { cn } from "@/lib/cn";

type StepProps = {
  data: Record<string, unknown>;
  setData: (key: string, value: unknown) => void;
  goNext: () => void;
  goBack: () => void;
};

const STEPS = ["Negocio", "Tipo", "Qué vendes", "Inventario", "Citas", "Mesas", "Equipo", "Comprobantes", "Datos"];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, unknown>>({});

  const set = (key: string, value: unknown) => setData((d) => ({ ...d, [key]: value }));
  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6">
      {/* Progreso */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-neutral-900">Configura tu negocio</h1>
          <span className="text-sm font-medium text-neutral-500">
            Paso {step + 1} de {STEPS.length}
          </span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-neutral-400">{Math.round(((step + 1) / STEPS.length) * 100)}%</p>
      </div>

      {step === 0 && <StepName data={data} setData={set} goNext={goNext} goBack={goBack} />}
      {step === 1 && <StepType data={data} setData={set} goNext={goNext} goBack={goBack} />}
      {step === 2 && <StepSells data={data} setData={set} goNext={goNext} goBack={goBack} />}
      {step === 3 && <StepInventory data={data} setData={set} goNext={goNext} goBack={goBack} />}
      {step === 4 && <StepAppointments data={data} setData={set} goNext={goNext} goBack={goBack} />}
      {step === 5 && <StepTables data={data} setData={set} goNext={goNext} goBack={goBack} />}
      {step === 6 && <StepTeam data={data} setData={set} goNext={goNext} goBack={goBack} />}
      {step === 7 && <StepDocuments data={data} setData={set} goNext={goNext} goBack={goBack} />}
      {step === 8 && <StepDetails data={data} setData={set} goNext={goNext} goBack={goBack} />}
    </div>
  );
}

// ---------- PASO 1: Nombre del negocio ----------
function StepName({ data, setData, goNext }: StepProps) {
  const [name, setName] = useState(String(data.name ?? ""));
  return (
    <StepLayout
      emoji="🏪"
      title="¿Cómo se llama tu negocio?"
      subtitle="Este nombre lo verás en tu sistema y en tu catálogo."
    >
      <Input
        autoFocus
        placeholder="Ej: Artesanías Killa"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Button fullWidth size="lg" disabled={name.trim().length < 2} onClick={() => { setData("name", name.trim()); goNext(); }}>
        Continuar
      </Button>
    </StepLayout>
  );
}

// ---------- PASO 2: Tipo de negocio ----------
function StepType({ data, setData, goNext }: StepProps) {
  const selected = String(data.businessType ?? "");
  return (
    <StepLayout
      emoji="🧩"
      title="¿Qué tipo de negocio tienes?"
      subtitle="El sistema se configura automáticamente según tu respuesta."
    >
      <div className="grid grid-cols-2 gap-2.5">
        {BUSINESS_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setData("businessType", t.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-4 text-sm font-semibold transition-colors",
              selected === t.value
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
            )}
          >
            <span className="text-3xl">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>
      <Button fullWidth size="lg" disabled={!selected} onClick={goNext}>
        Continuar
      </Button>
    </StepLayout>
  );
}

// ---------- PASO 3: Qué vendes ----------
function StepSells({ data, setData, goNext }: StepProps) {
  const options = [
    { value: "productos", emoji: "📦", label: "Productos" },
    { value: "servicios", emoji: "💼", label: "Servicios" },
    { value: "ambos", emoji: "🧾", label: "Productos y servicios" },
  ];
  const selected = String(data.sellsProducts ?? "");
  return (
    <StepLayout emoji="🛍️" title="¿Qué vendes?" subtitle="Así te mostramos lo que necesitas registrar.">
      <div className="space-y-2.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setData("sellsProducts", o.value)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left font-semibold transition-colors",
              selected === o.value
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-neutral-200 bg-white text-neutral-700"
            )}
          >
            <span className="text-2xl">{o.emoji}</span>
            {o.label}
          </button>
        ))}
      </div>
      <Button fullWidth size="lg" disabled={!selected} onClick={goNext}>
        Continuar
      </Button>
    </StepLayout>
  );
}

// ---------- PASO 4: Inventario ----------
function StepInventory({ data, setData, goNext, goBack }: StepProps) {
  const selected = String(data.needsInventory ?? "");
  return (
    <StepLayout emoji="📊" title="¿Necesitas controlar tu stock?" subtitle="Saber cuánto te queda de cada producto.">
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { value: "si", label: "Sí, claro", emoji: "✅" },
          { value: "no", label: "No por ahora", emoji: "🙅" },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setData("needsInventory", o.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-5 text-sm font-semibold",
              selected === o.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-neutral-700"
            )}
          >
            <span className="text-2xl">{o.emoji}</span>
            {o.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" fullWidth size="lg" onClick={goBack}>
          Atrás
        </Button>
        <Button fullWidth size="lg" disabled={!selected} onClick={goNext}>
          Continuar
        </Button>
      </div>
    </StepLayout>
  );
}

// ---------- PASO 5: Citas ----------
function StepAppointments({ data, setData, goNext, goBack }: StepProps) {
  const selected = String(data.needsAppointments ?? "");
  return (
    <StepLayout emoji="📅" title="¿Manejas citas o turnos?" subtitle="Por ejemplo: citas de belleza, consultas o talleres.">
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { value: "si", label: "Sí", emoji: "✅" },
          { value: "no", label: "No", emoji: "🙅" },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setData("needsAppointments", o.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-5 text-sm font-semibold",
              selected === o.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-neutral-700"
            )}
          >
            <span className="text-2xl">{o.emoji}</span>
            {o.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" fullWidth size="lg" onClick={goBack}>
          Atrás
        </Button>
        <Button fullWidth size="lg" disabled={!selected} onClick={goNext}>
          Continuar
        </Button>
      </div>
    </StepLayout>
  );
}

// ---------- PASO 6: Mesas ----------
function StepTables({ data, setData, goNext, goBack }: StepProps) {
  const selected = String(data.needsTables ?? "");
  return (
    <StepLayout emoji="🍽️" title="¿Manejas mesas?" subtitle="Útil para restaurantes, cafeterías y bodegones.">
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { value: "si", label: "Sí, tenemos mesas", emoji: "🍽️" },
          { value: "no", label: "No", emoji: "🙅" },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setData("needsTables", o.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-5 text-sm font-semibold",
              selected === o.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-neutral-700"
            )}
          >
            <span className="text-2xl">{o.emoji}</span>
            {o.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" fullWidth size="lg" onClick={goBack}>
          Atrás
        </Button>
        <Button fullWidth size="lg" disabled={!selected} onClick={goNext}>
          Continuar
        </Button>
      </div>
    </StepLayout>
  );
}

// ---------- PASO 7: Equipo ----------
function StepTeam({ data, setData, goNext, goBack }: StepProps) {
  const [employees, setEmployees] = useState(String(data.employees ?? "1"));
  return (
    <StepLayout emoji="👥" title="¿Cuántas personas trabajan aquí?" subtitle="Inclúyete tú.">
      <div className="flex items-center justify-center gap-4 py-2">
        <Button variant="secondary" size="lg" onClick={() => setEmployees((String(Math.max(1, Number(employees) - 1))))}>
          −
        </Button>
        <span className="w-16 text-center text-4xl font-extrabold text-neutral-900">{employees}</span>
        <Button variant="secondary" size="lg" onClick={() => setEmployees(String(Number(employees) + 1))}>
          +
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" fullWidth size="lg" onClick={goBack}>
          Atrás
        </Button>
        <Button fullWidth size="lg" onClick={() => { setData("employees", employees); goNext(); }}>
          Continuar
        </Button>
      </div>
    </StepLayout>
  );
}

// ---------- PASO 8: Comprobantes ----------
function StepDocuments({ data, setData, goNext, goBack }: StepProps) {
  const selected = String(data.issuesDocuments ?? "");
  return (
    <StepLayout
      emoji="🧾"
      title="¿Emites comprobantes?"
      subtitle="Boletas y facturas electrónicas. Por ahora usamos el ambiente de prueba (BETA)."
    >
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { value: "si", label: "Sí, emito comprobantes", emoji: "🧾" },
          { value: "no", label: "No por ahora", emoji: "🙅" },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setData("issuesDocuments", o.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border-2 px-3 py-5 text-sm font-semibold",
              selected === o.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-neutral-700"
            )}
          >
            <span className="text-2xl">{o.emoji}</span>
            {o.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" fullWidth size="lg" onClick={goBack}>
          Atrás
        </Button>
        <Button fullWidth size="lg" disabled={!selected} onClick={goNext}>
          Continuar
        </Button>
      </div>
    </StepLayout>
  );
}

// ---------- PASO 9: Datos opcionales ----------
function StepDetails({ data, setData, goBack }: StepProps) {
  const [formState, formAction] = useActionState(createBusinessAction, {});
  const { pending } = useFormStatus();

  const [ruc, setRuc] = useState(String(data.ruc ?? ""));
  const [razonSocial, setRazonSocial] = useState(String(data.razonSocial ?? ""));
  const [phone, setPhone] = useState(String(data.phone ?? ""));
  const [address, setAddress] = useState(String(data.address ?? ""));
  const [city, setCity] = useState(String(data.city ?? "Urubamba"));

  return (
    <StepLayout
      emoji="🚀"
      title="Últimos datos"
      subtitle="Opcionales. Puedes completarlos después desde Configuración."
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="name" value={String(data.name ?? "")} />
        <input type="hidden" name="business_type" value={String(data.businessType ?? "")} />
        <input type="hidden" name="sells_products" value={String(data.sellsProducts ?? "productos")} />
        <input type="hidden" name="needs_inventory" value={String(data.needsInventory ?? "si")} />
        <input type="hidden" name="needs_appointments" value={String(data.needsAppointments ?? "no")} />
        <input type="hidden" name="needs_tables" value={String(data.needsTables ?? "no")} />
        <input type="hidden" name="employees" value={String(data.employees ?? "1")} />
        <input type="hidden" name="issues_documents" value={String(data.issuesDocuments ?? "si")} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="RUC (11 dígitos)">
            <Input placeholder="Ej: 20601234567" value={ruc} onChange={(e) => setRuc(e.target.value.replace(/\D/g, "").slice(0, 11))} />
          </Field>
          <Field label="Razón social">
            <Input placeholder="Opcional" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Teléfono / WhatsApp">
            <Input placeholder="Ej: 984 123 456" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Ciudad">
            <Select value={city} onChange={(e) => setCity(e.target.value)}>
              <option>Urubamba</option>
              <option>Ollantaytambo</option>
              <option>Cusco</option>
              <option>Otra</option>
            </Select>
          </Field>
        </div>
        <Field label="Dirección">
          <Input placeholder="Ej: Av. Ferrocarril 123" value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>

        {formState.error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formState.error}</p>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button type="button" variant="secondary" fullWidth size="lg" onClick={goBack}>
            Atrás
          </Button>
          <Button type="submit" fullWidth size="lg" loading={pending}>
            Crear mi negocio
          </Button>
        </div>
      </form>
    </StepLayout>
  );
}

// ---------- Layout del paso ----------
function StepLayout({
  emoji,
  title,
  subtitle,
  children,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <span className="text-5xl">{emoji}</span>
        <h2 className="mt-3 text-2xl font-bold text-neutral-900">{title}</h2>
        <p className="mt-1 text-neutral-500">{subtitle}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}