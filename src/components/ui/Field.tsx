"use client";

import { cn } from "@/lib/cn";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useState } from "react";

const baseField =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-neutral-100";

type FieldProps = {
  label?: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, children, htmlFor }: FieldProps & { children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-neutral-700">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-neutral-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function Input({
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  return (
    <Field label={label} hint={hint} error={error} htmlFor={props.id}>
      <input className={cn(baseField, error && "border-red-400 focus:ring-red-400", className)} {...props} />
    </Field>
  );
}

export function Select({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  return (
    <Field label={label} hint={hint} error={error} htmlFor={props.id}>
      <select className={cn(baseField, "appearance-none", error && "border-red-400", className)} {...props}>
        {children}
      </select>
    </Field>
  );
}

export function Textarea({
  label,
  hint,
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  return (
    <Field label={label} hint={hint} error={error} htmlFor={props.id}>
      <textarea className={cn(baseField, "min-h-24", error && "border-red-400", className)} {...props} />
    </Field>
  );
}

/** Switch simple (checkbox estilizado). */
export function Switch({
  label,
  description,
  checked,
  onChange,
  name,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  name?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 cursor-pointer">
      <div>
        <p className="font-medium text-neutral-800">{label}</p>
        {description && <p className="text-sm text-neutral-500">{description}</p>}
      </div>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-neutral-300 transition-colors peer-checked:bg-brand-600 after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}