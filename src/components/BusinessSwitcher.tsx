"use client";

import { useRef } from "react";
import { switchBusinessAction } from "@/app/actions/business";

type BusinessOption = { id: string; name: string };

/**
 * Selector de negocio activo. Envía el cambio mediante una Server Action POST
 * (no GET), y switchBusinessAction valida la pertenencia del usuario al negocio.
 */
export default function BusinessSwitcher({
  businesses,
  currentId,
}: {
  businesses: BusinessOption[];
  currentId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={switchBusinessAction} className="hidden sm:block">
      <select
        name="business"
        defaultValue={currentId}
        onChange={(e) => {
          if (e.target.value) formRef.current?.requestSubmit();
        }}
        className="rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-sm"
      >
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </form>
  );
}