"use client";

import { useActionState, useState } from "react";
import { assignBusinessPlanAction } from "@/app/actions/plans";
import { PLAN_CATALOG } from "@/lib/constants";

export default function PlanAssignmentForm({
  businessId,
  currentPlanCode,
}: {
  businessId: string;
  currentPlanCode: string;
}) {
  const [state, action, pending] = useActionState(assignBusinessPlanAction, {});
  const initialPlan = PLAN_CATALOG.some((plan) => plan.code === currentPlanCode) ? currentPlanCode : "free";
  const [selectedPlan, setSelectedPlan] = useState(initialPlan);
  const paidPlan = PLAN_CATALOG.find((plan) => plan.code === selectedPlan)?.price !== 0;

  return (
    <form action={action} className="min-w-64 space-y-2">
      <input type="hidden" name="business_id" value={businessId} />
      <div className="flex items-center gap-2">
        <select
          name="plan_code"
          value={selectedPlan}
          onChange={(event) => setSelectedPlan(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2 py-2 text-xs"
        >
          {PLAN_CATALOG.map((plan) => (
            <option key={plan.code} value={plan.code}>{plan.name} · S/ {plan.price}/mes</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-md bg-neutral-900 px-3 py-2 text-xs font-bold text-white hover:bg-neutral-700 disabled:opacity-60"
        >
          {pending ? "Guardando" : "Asignar"}
        </button>
      </div>
      {paidPlan && (
        <label className="flex items-start gap-2 text-xs text-neutral-600">
          <input type="checkbox" name="payment_confirmed" value="yes" required className="mt-0.5 accent-emerald-800" />
          Cobro manual confirmado
        </label>
      )}
      {state.error && <p role="alert" className="text-xs text-red-700">{state.error}</p>}
      {state.ok && <p role="status" className="text-xs text-emerald-700">Plan actualizado.</p>}
    </form>
  );
}