"use client";

import { useActionState, useState } from "react";
import { adjustStockAction } from "@/app/actions/inventory";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

export default function AdjustStockForm({
  productId,
  productName,
  currentStock,
  unit,
}: {
  productId: string;
  productName: string;
  currentStock: number;
  unit: string;
}) {
  const [formState, formAction] = useActionState(adjustStockAction, {});
  const [type, setType] = useState("entrada");
  const [quantity, setQuantity] = useState("");

  return (
    <form action={formAction} className="space-y-5 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="type" value={type} />

      <div>
        <p className="text-sm font-semibold text-neutral-700">{productName}</p>
        <p className="text-sm text-neutral-500">
          Stock actual: <span className="font-bold text-neutral-800">{formatNumber(currentStock)} {unit}</span>
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { value: "entrada", label: "Entrada", emoji: "📥", color: "border-emerald-500 bg-emerald-50 text-emerald-700" },
          { value: "salida", label: "Salida", emoji: "📤", color: "border-red-500 bg-red-50 text-red-700" },
          { value: "ajuste", label: "Corregir", emoji: "✏️", color: "border-amber-500 bg-amber-50 text-amber-700" },
        ].map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setType(o.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-3 text-sm font-semibold",
              type === o.value ? o.color : "border-neutral-200 text-neutral-600"
            )}
          >
            <span className="text-xl">{o.emoji}</span>
            {o.label}
          </button>
        ))}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
          {type === "entrada" && "Cantidad que entra"}
          {type === "salida" && "Cantidad que sale"}
          {type === "ajuste" && "Nuevo stock exacto"}
        </label>
        <input
          type="number"
          name="quantity"
          step="0.01"
          min="0"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Ej: 10"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-lg font-bold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <p className="mt-1 text-xs text-neutral-500">
          {type === "ajuste" ? "El stock quedará exactamente en ese valor." : `Unidad: ${unit}`}
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-neutral-700">Motivo (opcional)</label>
        <input
          type="text"
          name="reason"
          placeholder="Ej: Compra a proveedor, merma, corrección de conteo"
          className="w-full rounded-xl border border-neutral-300 px-4 py-3 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {formState.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{formState.error}</p>
      )}

      <Button type="submit" fullWidth size="lg">
        Guardar movimiento
      </Button>
    </form>
  );
}