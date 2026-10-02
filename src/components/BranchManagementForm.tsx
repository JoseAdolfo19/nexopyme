"use client";

import { useActionState } from "react";
import { createBranchAction } from "@/app/actions/business";
import { Input } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";

type Branch = { id: string; name: string; address: string | null; isMain: boolean };

export default function BranchManagementForm({
  branches,
  maxBranches,
  canManage,
}: {
  branches: Branch[];
  maxBranches: number | null;
  canManage: boolean;
}) {
  const [state, action] = useActionState(createBranchAction, {});
  const atLimit = maxBranches !== null && branches.length >= maxBranches;

  return (
    <div className="space-y-5">
      {canManage && !atLimit && (
        <form action={action} className="grid gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-2">
          <Input label="Nombre" name="name" placeholder="Sucursal Centro" required />
          <Input label="Dirección" name="address" placeholder="Av. Principal 123" />
          <Input label="Teléfono" name="phone" type="tel" placeholder="999 999 999" />
          <div className="flex items-end"><SubmitButton>Agregar sucursal</SubmitButton></div>
        </form>
      )}

      {state.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Sucursal agregada.</p>}
      {!canManage && <p className="text-sm text-neutral-500">Solo los administradores pueden agregar sucursales.</p>}
      {canManage && atLimit && <p className="text-sm text-amber-700">Alcanzaste el máximo de {maxBranches} sucursales de tu plan.</p>}

      <div className="divide-y divide-neutral-100">
        {branches.map((branch) => (
          <div key={branch.id} className="flex items-start justify-between gap-3 py-3">
            <div>
              <p className="font-semibold text-neutral-900">{branch.name}{branch.isMain ? " · Principal" : ""}</p>
              {branch.address && <p className="text-sm text-neutral-500">{branch.address}</p>}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-neutral-500">{branches.length} de {maxBranches ?? "Ilimitado"} sucursales usadas</p>
    </div>
  );
}