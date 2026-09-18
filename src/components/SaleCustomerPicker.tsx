"use client";

import { useState, useTransition } from "react";
import { createCustomerForSaleAction } from "@/app/actions/customers";
import { CUSTOMER_DOC_TYPES } from "@/lib/constants";

export type SaleCustomer = {
  id: string;
  name: string;
  docNumber: string | null;
  docType: string;
};

export default function SaleCustomerPicker({
  customers,
  value,
  onChange,
}: {
  customers: SaleCustomer[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [availableCustomers, setAvailableCustomers] = useState(customers);
  const [documentNumber, setDocumentNumber] = useState("");
  const [documentType, setDocumentType] = useState("DNI");
  const [name, setName] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const searchDocument = async () => {
    setLookupError("");
    const clean = documentNumber.replace(/\D/g, "");
    if (clean.length !== 8 && clean.length !== 11) {
      setLookupError("Ingresa un DNI de 8 o un RUC de 11 dígitos.");
      return;
    }

    const existing = availableCustomers.find((customer) => customer.docNumber === clean);
    if (existing) {
      onChange(existing.id);
      setShowForm(false);
      return;
    }

    try {
      const response = await fetch(`/api/sunat/lookup?docNumber=${clean}`, { cache: "no-store" });
      const result = await response.json() as { data?: { nombreCompleto?: string; razonSocial?: string }; error?: string };
      if (!response.ok) throw new Error(result.error ?? "No se encontró el documento.");

      setDocumentType(clean.length === 8 ? "DNI" : "RUC");
      setName(result.data?.nombreCompleto ?? result.data?.razonSocial ?? "");
      setShowForm(true);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "No se pudo consultar el documento.");
      setShowForm(true);
    }
  };

  const registerCustomer = () => {
    setFormError("");
    const formData = new FormData();
    formData.set("doc_type", documentType);
    formData.set("doc_number", documentNumber);
    formData.set("name", name);

    startTransition(async () => {
      const result = await createCustomerForSaleAction(formData);
      if ("error" in result) {
        setFormError(result.error);
        return;
      }

      const customer = result.customer;
      setAvailableCustomers((current) => [customer, ...current.filter((item) => item.id !== customer.id)]);
      onChange(customer.id);
      setShowForm(false);
      setLookupError("");
    });
  };

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-sm font-semibold text-neutral-700">Cliente</label>
      <select
        name="customer_id"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base"
      >
        <option value="">Cliente ocasional (sin datos)</option>
        {availableCustomers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name} {customer.docNumber ? `· ${customer.docType} ${customer.docNumber}` : ""}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          value={documentNumber}
          onChange={(event) => setDocumentNumber(event.target.value)}
          placeholder="Buscar por DNI o RUC"
          inputMode="numeric"
          className="min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm"
        />
        <button type="button" onClick={searchDocument} className="rounded-xl border border-brand-600 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
          Buscar
        </button>
      </div>

      {lookupError && <p className="text-xs text-amber-700">{lookupError}</p>}

      {showForm && (
        <div className="space-y-2 rounded-xl border border-brand-200 bg-brand-50 p-3">
          <p className="text-sm font-semibold text-brand-800">Cliente nuevo</p>
          <div className="grid grid-cols-2 gap-2">
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm">
              {CUSTOMER_DOC_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} className="rounded-lg border border-neutral-300 px-2 py-2 text-sm" placeholder="Documento" />
          </div>
          <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-neutral-300 px-2 py-2 text-sm" placeholder="Nombre completo o razón social" />
          {formError && <p className="text-xs text-red-700">{formError}</p>}
          <button type="button" onClick={registerCustomer} disabled={isPending || !name.trim()} className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {isPending ? "Registrando..." : "Registrar y agregar a la venta"}
          </button>
        </div>
      )}
    </div>
  );
}
