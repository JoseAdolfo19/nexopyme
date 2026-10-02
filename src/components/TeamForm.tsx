"use client";

import { useActionState } from "react";
import { saveTeamMemberAction } from "@/app/actions/team";
import { ROLES } from "@/lib/constants";
import { Input, Select } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";

type Member = { userId: string; name: string; email: string; role: string; isActive: boolean };

export default function TeamForm({ members, canManage }: { members: Member[]; canManage: boolean }) {
  const [state, action] = useActionState(saveTeamMemberAction, {});

  if (!canManage) {
    return <p className="text-sm text-neutral-500">Solo los administradores pueden gestionar los roles del equipo.</p>;
  }

  return (
    <div className="space-y-5">
      <form action={action} className="grid gap-3 rounded-xl bg-neutral-50 p-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <Input label="Correo de usuario existente" name="email" type="email" placeholder="persona@correo.com" required />
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Rol</label>
          <Select name="role" defaultValue="vendedor">
            {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </Select>
        </div>
        <SubmitButton>Agregar usuario</SubmitButton>
      </form>

      {state.error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Equipo actualizado.</p>}

      <div className="divide-y divide-neutral-100">
        {members.map((member) => (
          <div key={member.userId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-neutral-900">{member.name}</p>
              <p className="text-sm text-neutral-500">{member.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <form action={action} className="flex items-center gap-2">
                <input type="hidden" name="operation" value="update" />
                <input type="hidden" name="user_id" value={member.userId} />
                <Select name="role" defaultValue={member.role}>
                  {ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </Select>
                <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">Guardar</button>
              </form>
              <form action={action}>
                <input type="hidden" name="operation" value="remove" />
                <input type="hidden" name="user_id" value={member.userId} />
                <input type="hidden" name="role" value={member.role} />
                <button type="submit" className="rounded-lg px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Retirar</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
